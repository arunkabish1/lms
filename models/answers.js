'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Answers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Answers.init({
    question: DataTypes.TEXT,
    answer: DataTypes.TEXT,
    option1: DataTypes.TEXT,
    option2: DataTypes.TEXT,
    option3: DataTypes.TEXT,
    studentanswer: DataTypes.TEXT,
    chapterid: DataTypes.INTEGER,
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, 
    },
  }, {
    sequelize,
    modelName: 'Answers',
  });
  return Answers;
};