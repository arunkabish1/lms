'use strict';
const {
  Model
} = require('sequelize');
const User = require("./user");
module.exports = (sequelize, DataTypes) => {
  class register extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      register.belongsTo(models.User, { foreignKey: "userId" });
      
    }
  }
  register.init({
    courseId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'register',
  });
  return register;
};