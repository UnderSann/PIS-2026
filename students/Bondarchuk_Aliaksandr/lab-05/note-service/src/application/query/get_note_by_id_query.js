class GetNoteByIdQuery {
  #noteId;

  constructor(noteId) {
    if (!noteId || typeof noteId !== 'string' || noteId.trim() === '') {
      throw new Error('NoteId must be a non-empty string');
    }
    this.#noteId = noteId;
  }

  get noteId() { return this.#noteId; }
}

module.exports = GetNoteByIdQuery;
