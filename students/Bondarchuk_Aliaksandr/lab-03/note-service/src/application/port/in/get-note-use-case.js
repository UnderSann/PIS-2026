// src/application/port/in/get-note-use-case.js

class GetNoteQuery {
  constructor(noteId, userId) {
    this.noteId = noteId;
    this.userId = userId;
  }
}

class IGetNoteUseCase {
  async execute(query) {
    throw new Error('Not implemented');
  }
}

module.exports = { GetNoteQuery, IGetNoteUseCase };