class CreateNoteCommand {
  #ownerId;
  #title;
  #content;

  constructor(ownerId, title, content) {
    // Валидация примитивов
    if (!ownerId || typeof ownerId !== 'string' || ownerId.trim() === '') {
      throw new Error('OwnerId must be a non-empty string');
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new Error('Title must be a non-empty string');
    }
    if (title.length > 255) {
      throw new Error('Title must not exceed 255 characters');
    }
    if (content !== undefined && content !== null && typeof content !== 'string') {
      throw new Error('Content must be a string if provided');
    }

    this.#ownerId = ownerId;
    this.#title = title;
    this.#content = content || '';
  }

  get ownerId() { return this.#ownerId; }
  get title() { return this.#title; }
  get content() { return this.#content; }
}

module.exports = CreateNoteCommand;