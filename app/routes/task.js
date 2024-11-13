const express = require('express');
const taskController = require('../controllers/task');
const router = express.Router();
const { verifyToken } = require('../middlewares');

// Routers  
router.get('/', taskController.getTasksList);
router.get('/list', verifyToken, taskController.getTaskList);
router.post('/add/subList', verifyToken, taskController.addSublist);
router.get('/list/all', taskController.getLists);
router.get('/subList/all', verifyToken, taskController.getAllSublists);
router.post('/add/subList/section', verifyToken, taskController.addSublistSections);
router.get('/subList/section', verifyToken, taskController.getSublistSections);
router.post('/add/listSection', verifyToken, taskController.addListSection)
router.get('/listSection', verifyToken, taskController.getListSectionsByListId)
router.get('/googleTasks', verifyToken, taskController.getTasksbyId)

// router.get('/gapi/allTask', taskController.listFromGapi);

module.exports = router;



