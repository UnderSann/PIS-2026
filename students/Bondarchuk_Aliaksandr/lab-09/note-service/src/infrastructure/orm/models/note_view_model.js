const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NoteViewModel = sequelize.define('NoteView', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'owner_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_deleted',
    },
    // Денормализованные поля для оптимизации
    shortPreview: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.content ? this.content.substring(0, 100) : '';
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  }, {
    tableName: 'note_views',
    timestamps: false,
  });

  return NoteViewModel;
};