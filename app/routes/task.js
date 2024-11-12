const express = require('express');
const taskController = require('../controllers/task');
const router = express.Router();
const { verifyToken } = require('../middlewares');

// Routers  
router.get('/', taskController.getTasksList);
router.get('/list', taskController.getTaskList);
router.post('/add/subList', taskController.addSublist);
router.get('/list/all', taskController.getLists);
router.get('/subList/all', taskController.getAllSublists);
router.post('/add/subList/section', taskController.addSublistSections);
router.get('/subList/section', taskController.getSublistSections);
router.post('/add/listSection',taskController.addListSection)
router.get('/listSection',taskController.getListSectionsByListId)
router.get('/googleTasks',taskController.getTasksbyId)

// router.get('/gapi/allTask', taskController.listFromGapi);

module.exports = router;



