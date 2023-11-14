'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Answers', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Make sure this line is present
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Answers', 'userId');
  },
};
