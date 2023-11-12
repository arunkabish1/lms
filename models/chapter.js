'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Chapter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Chapter.belongsTo(models.Course, { foreignKey: "courseId" });
    }
    static addchapter(title, description, courseId) {
      return Chapter.create({
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        courseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      });  // define association here
    }
  }
  Chapter.init({
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    courseId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Chapter',
  });
  return Chapter;
};