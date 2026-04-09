class NoteDto {
  constructor(id, ownerId, title, content, version, isDeleted, createdAt, updatedAt) {
    this.id = id;
    this.ownerId = ownerId;
    this.title = title;
    this.content = content;
    this.version = version;
    this.isDeleted = isDeleted;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = NoteDto;