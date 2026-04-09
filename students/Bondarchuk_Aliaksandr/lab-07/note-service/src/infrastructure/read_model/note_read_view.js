const { DataTypes } = require('sequelize');

class NoteReadView {
  static initialize(sequelize) {
    return sequelize.define('note_read_views', {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      owner_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      content_preview: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Первые 500 символов для списка',
      },
      content_full: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      // Денормализованные поля для оптимизации
      word_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      last_edited_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      sync_status: {
        type: DataTypes.ENUM('synced', 'pending', 'conflict'),
        defaultValue: 'synced',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      // Поле для полнотекстового поиска
      search_vector: {
        type: DataTypes.TSVECTOR,
      },
    }, {
      indexes: [
        { fields: ['owner_id'] },
        { fields: ['sync_status'] },
        { fields: ['updated_at'] },
        { fields: ['owner_id', 'is_deleted', 'updated_at'] }, // Композитный для частых запросов
        { fields: ['search_vector'], using: 'gin' }, // GIN индекс для полнотекстового поиска
      ],
    });
  }
}