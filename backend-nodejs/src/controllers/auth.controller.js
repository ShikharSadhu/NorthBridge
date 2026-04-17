const userController = require('./user.controller');

module.exports = {
	getCurrentUserController: userController.getCurrentUserController,
	listUsersController: userController.listUsersController,
	loginController: userController.loginController,
	logoutController: userController.logoutController,
	signupController: userController.signupController,
	updateUserProfileController: userController.updateUserProfileController,
};
