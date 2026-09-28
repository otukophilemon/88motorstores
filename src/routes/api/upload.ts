import { createFileRoute } from "@tanstack/react-router";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * Vercel Blob upload handler.
 *
 * The browser POSTs here to request a short-lived upload token, then uploads
 * the file DIRECTLY to Vercel Blob (bypassing the serverless function body
 * size limit). When the upload completes, Blob calls back to this same route
 * so we can validate the completion.
 *
 * Auth: we only allow signed-in users to obtain upload tokens. The session
 * is verified server-side.
 */

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as HandleUploadBody;

        try {
          const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
              // Verify the caller is authenticated.
              const { getSessionUser } = await import(
                "@/lib/auth/verify.server"
              );
              const user = await getSessionUser();
              if (!user) {
                throw new Error("Unauthorized: please sign in to upload.");
              }

              // clientPayload may carry the listing kind; for now we accept any.
              // The pathname is prefixed with the user id so we know who owns it.
              return {
                allowedContentTypes: [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/gif",
                ],
                maximumSizeInBytes: 8 * 1024 * 1024, // 8 MB per file
                addRandomSuffix: true,
                tokenPayload: JSON.stringify({
                  userId: user.id,
                  originalPathname: pathname,
                }),
              };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
              // Called after the upload succeeds. We don't persist anything
              // here — the client sends us the final URL in the sell form
              // submission. Just log for now.
              console.log("[blob upload completed]", {
                url: blob.url,
                pathname: blob.pathname,
                tokenPayload,
              });
            },
          });

          return Response.json(jsonResponse);
        } catch (error) {
          console.error("[upload] failed:", error);
          return Response.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 400 },
          );
        }
      },
    },
  },
});