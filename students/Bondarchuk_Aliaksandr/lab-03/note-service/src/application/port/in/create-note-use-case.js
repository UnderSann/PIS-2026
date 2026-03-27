// src/application/port/in/create-note-use-case.js

class CreateNoteCommand {
  constructor(ownerId, title, fileContent) {
    this.ownerId = ownerId;
    this.title = title;
    this.fileContent = fileContent;
  }
}

class ICreateNoteUseCase {
  async execute(command) {
    throw new Error('Not implemented');
  }
}

module.exports = { CreateNoteCommand, ICreateNoteUseCase };