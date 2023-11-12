'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Course.belongsTo(models.User, { foreignKey: "userId" });
    }
    static addcourse(title, description) {
      return Course.create({
        title,
        description,
        educator,
      });
    }
  }
  Course.init({
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    educator: DataTypes.STRING,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Course',
  });
  return Course;
};