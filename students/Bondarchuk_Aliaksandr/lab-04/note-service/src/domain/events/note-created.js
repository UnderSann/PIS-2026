class NoteCreated {
  #noteId;
  #ownerId;
  #title;
  #occurredAt;

  constructor(noteId, ownerId, title) {
    this.#noteId = noteId;
    this.#ownerId = ownerId;
    this.#title = title;
    this.#occurredAt = new Date();
  }

  get noteId() { return this.#noteId; }
  get ownerId() { return this.#ownerId; }
  get title() { return this.#title; }
  get occurredAt() { return this.#occurredAt; }
}

module.exports = NoteCreated;