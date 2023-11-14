// Example migration file content
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Assignments', 'courseId', 'chapterId');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Assignments', 'chapterId', 'courseId');
  }
};
