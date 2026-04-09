class Note {
  constructor(id, ownerId, title, content) {
    this.id = id;
    this.ownerId = ownerId;
    this.title = title;
    this.content = content;
    this.version = 1;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.isDeleted = false;
  }

  updateContent(newContent) {
    this.content = newContent;
    this.version += 1;
    this.updatedAt = new Date();
  }

  updateTitle(newTitle) {
    this.title = newTitle;
    this.updatedAt = new Date();
  }

  delete() {
    this.isDeleted = true;
    this.updatedAt = new Date();
  }

  restore() {
    this.isDeleted = false;
    this.updatedAt = new Date();
  }
}

module.exports = Note;