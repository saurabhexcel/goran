const express = require('express');
const taskController = require('../controllers/task');
const router = express.Router();
const { verifyToken } = require('../middlewares');

// Routers  
router.get('/', taskController.getTasksList);
router.get('/list', taskController.getTaskList);
router.post('/subList/add', taskController.addSublist);
router.get('/list/all', taskController.getLists);
router.get('/subList/all', taskController.getAllSublists);
router.post('/subList/section/add', taskController.addSublistSections);
router.get('/subList/section/get', taskController.getSublistSections);
// router.get('/gapi/allTask', taskController.listFromGapi);

module.exports = router;



