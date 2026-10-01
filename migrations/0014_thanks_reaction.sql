alter table reactions
  drop constraint if exists reactions_emoji_check;

alter table reactions
  add constraint reactions_emoji_check
    check (emoji in ('👍', '❤️', '😂', '😮', '😢', '😡', '🙏'));