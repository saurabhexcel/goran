const { google } = require('googleapis');
const oauth2Client = require('../config/oauth2Client');
const knex = require("./../../knex/knex");
const jwt = require('jsonwebtoken')



exports.getTasksList = async (req, res) => {

    const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
    const taskLists = await tasksApi.tasklists.list();
    const allTasks = [];

    for (const taskList of taskLists.data.items) {
        const tasks = await tasksApi.tasks.list({ tasklist: taskList.id });
        allTasks.push(...tasks.data.items);
    }

    res.json(allTasks);
}

exports.getTaskList = async (req, res) => {
    try {
        const {email} = req.decoded;

        // Initialize Google API client
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
        const taskLists = await tasksApi.tasklists.list();

        // Check if task lists are returned
        if (!taskLists.data.items || taskLists.data.items.length === 0) {
            console.log('No task lists found.');
            return res.status(404).json({ message: 'No task lists found' });
        }

        const lists = taskLists.data.items;

        // Fetch user data from DB
         let userData = await knex('googleUsers').where({ email }).first();

        if (userData && typeof userData.data === 'string') {
            try {
                userData.data = JSON.parse(userData.data);
            } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                return res.status(500).json({ message: 'Failed to parse user data' });
            }
        }

        let Udata = userData.data || { google_lists: {} };

        // Initialize google_lists if missing
        if (!Udata.google_lists) {
            console.log('Initializing google_lists for user...');
            Udata.google_lists = {};
        }

        // Update google_lists with new task lists
        lists.forEach(list => {
            if (!Udata.google_lists[list.id]) {
                console.log(`Adding new list ${list.id} to google_lists`);
                Udata.google_lists[list.id] = {
                    google_list_id: list.id,
                    google_list_name: list.title,
                    sublists: {},
                    sections:{}
                };
            }
        });

        // Save updated user data back to DB
        console.log('Saving updated user data to DB...');
        await knex('googleUsers').where({ email }).update({ data: JSON.stringify(Udata) });

        const googleList = Udata.google_lists;

        const basesublists = Object.keys(googleList).map(listId => {
            return {
                ...googleList[listId],
                listid: listId,
                sublists: Object.values(googleList[listId].sublists || {}).map(sublist => {
                    return {
                        sublist_id: sublist.sublist_id,  // Ensure this exists
                        sublist_name: sublist.sublist_name
                    };
                })
            };
        });

        // Send the lists and sublists to the frontend
        res.render('dashboard', {
            baselists: lists.length > 0 ? lists : [],
            basesublists: basesublists.length > 0 ? basesublists : [],
        });

    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

exports.addSublist = async (req, res) => {
    try {
        const {email} = req.decoded;
        const { google_list_id, sublist_name } = req.body;

        // Fetch existing data from the 'googleUsers' table
        let userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        // Parse the data if stored as a longtext string
        let Udata = userData.data;
        if (typeof Udata === 'string') {
            try {
                Udata = JSON.parse(Udata);
            } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                return res.status(500).json({ message: 'Failed to parse user data' });
            }
        }

        // Check if the google_list_id exists in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Generate a unique sublist ID
        const sublist_id = Date.now().toString();

        // Add the new sublist under the specified google_list_id
        Udata.google_lists[google_list_id].sublists[sublist_id] = {
            sublist_id,
            sublist_name,
            sections: {}
        };

        // Update the user data in the 'googleUsers' table
        await knex('googleUsers').where({ email }).update({ data: JSON.stringify(Udata) });

        res.status(201).json({ message: 'Sublist added successfully', data: Udata });
    } catch (error) {
        console.error('Error adding sublist:', error);
        res.status(500).json({ message: 'Failed to add sublist' });
    }
};


exports.getAllSublists = async (req, res) => {

    try {
        const { google_list_id } = req.query;
        const {email} = req.decoded;

        // Fetch the user's data from the 'googleUsers' table
        const userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        let Udata = null;
        try {
            // Parse the JSON string if the 'data' column is a JSON string
            Udata = JSON.parse(userData.data);
        } catch (error) {
            return res.status(500).json({ message: 'Error parsing user data' });
        }
        // Check if the google_list_id exists in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'Google list not found' });
        }

        const googleList = Udata.google_lists[google_list_id];

        // Check if there are sublists under the specified google_list_id
        if (!googleList.sublists || Object.keys(googleList.sublists).length === 0) {
            return res.status(404).json({ message: 'No sublists found for this Google list' });
        }

        // Retrieve all sublists under the provided google_list_id
        const sublists = googleList.sublists;

        console.log(sublists);

        // res.render('dashboard', {
        //     baselists: [],
        //     basesublists: Object.values(sublists)
        // });
        res.status(200).json({
            message: 'Sublists retrieved successfully',
            sublists: Object.values(sublists) // Convert the sublists object to an array of values
        });
    } catch (error) {
        console.error('Error retrieving sublists:', error);
        res.status(500).json({ message: 'Failed to retrieve sublists' });
    }
};


exports.addSublistSections = async (req, res) => {
    try {
        const {email} = req.decoded;
        const { google_list_id, subList_id, section_name } = req.body;

        // Fetch existing data from the 'googleUsers' table
        const userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        let Udata;
        try {
            // Parse the LONGTEXT data (stored as JSON string) into a JavaScript object
            Udata = JSON.parse(userData.data);
        } catch (error) {
            return res.status(500).json({ message: 'Error parsing user data' });
        }

        // Check if the google_list_id and subListId exist in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'List not found' });
        }
        if (!Udata.google_lists[google_list_id].sublists[subList_id]) {
            return res.status(404).json({ message: 'Sublist not found' });
        }

        const section_id = Date.now().toString();

        // Add the new section to the specified sublist
        Udata.google_lists[google_list_id].sublists[subList_id].sections[section_id] = {
            section_id,
            section_name
        };

        // Convert the updated `Udata` object back into a JSON string
        const updatedData = JSON.stringify(Udata);

        // Update the user data in the 'googleUsers' table (store as LONGTEXT)
        await knex('googleUsers').where({ email }).update({ data: updatedData });

        // Return the success response with updated data
        res.status(201).json({ message: 'Section added successfully', data: Udata });
    } catch (error) {
        console.error('Error adding section:', error);
        res.status(500).json({ message: 'Failed to add section' });
    }
};



exports.getLists = async (req, res) => {
    try {
        // const userEmail = req.cookies.userEmail; // Assuming the email is saved as a cookie called 'userEmail'

        // if (!userEmail) {
        //     return res.status(401).json({ message: 'User not authenticated' });
        // }

        const { google_list_id, sublist_name, userEmail } = req.body;

        const lists = await knex('googleUsers').where('email', userEmail).select('data');

        // const UserData = lists[0].data.google_lists
         // Parse the 'data' field (LONGTEXT) which is stored as a JSON string
         let UserData;
         try {
             UserData = JSON.parse(lists[0].data); // Convert the JSON string to a JavaScript object
         } catch (error) {
             return res.status(500).json({ message: 'Error parsing user data' });
         }

        res.status(200).send({ message: "all tasks here", UserData })

    } catch (error) {
        console.error('Error getting sublist:', error);
        res.status(500).json({ message: 'Failed to get Lists' });
    }
}

exports.getSublistSections = async (req, res) => {
    try {
        const {email} = req.decoded;

        const { google_list_id, sublist_id } = req.query;

        // Validate input parameters
        if (!email || !google_list_id || !sublist_id) {
            return res.status(400).json({ message: 'Missing required parameters: email, google_list_id, and sublist_id are required' });
        }

        // Fetch user data from the database
        let userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found in the database' });
        }

        // Parse user data (in case it's stored as a JSON string)
        if (typeof userData.data === 'string') {
            try {
                userData.data = JSON.parse(userData.data);
            } catch (parseError) {
                console.error('Error parsing user data:', parseError);
                return res.status(500).json({ message: 'Failed to parse user data' });
            }
        }

        // Retrieve the google_lists for the user
        const googleLists = userData.data.google_lists || {};
        const listData = googleLists[google_list_id];

        // Check if the provided google_list_id exists
        if (!listData) {
            return res.status(404).json({ message: `Google List ID ${google_list_id} not found` });
        }

        // Check if the provided sublist_id exists within the selected google_list_id
        const sublist = listData.sublists ? listData.sublists[sublist_id] : null;

        if (!sublist) {
            return res.status(404).json({ message: `Sublist ID ${sublist_id} not found within Google List ID ${google_list_id}` });
        }

        // Check if the sublist has sections
        const sections = sublist.sections || [];

        if (sections.length === 0) {
            return res.status(404).json({ message: `No sections found for Sublist ID ${sublist_id}` });
        }

        // Return the sections found in the sublist
        return res.status(200).json({
            message: 'Sections found',
            sections: Object.values(sections).map(section => ({
                section_id: section.section_id,  // Assuming each section has a unique ID
                section_name: section.section_name,  // The name or title of the section
            }))
        });

    } catch (err) {
        console.error('Error fetching sections:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}

exports.addListSection = async (req, res) => {
    try {
        const {email} = req.decoded;
        const { google_list_id, section_name } = req.body;

        // Retrieve user data
        const userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        let Udata;
        try {
            Udata = JSON.parse(userData.data);
        } catch (error) {
            return res.status(500).json({ message: 'Error parsing user data' });
        }

        // Check if google_list_id exists in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Generate a unique section ID
        const section_id = Date.now().toString();

        // Add the new section to the specified google_list_id
        if (!Udata.google_lists[google_list_id].sections) {
            Udata.google_lists[google_list_id].sections = {};
        }

        Udata.google_lists[google_list_id].sections[section_id] = {
            section_id,
            section_name
        };

        // Update the user data in the database
        await knex('googleUsers').where({ email }).update({ data: JSON.stringify(Udata) });

        res.status(201).json({ message: 'Section added successfully', data: Udata });
    } catch (error) {
        console.error('Error adding Google list section:', error);
        res.status(500).json({ message: 'Failed to add Google list section' });
    }
};


exports.getListSectionsByListId = async (req, res) => {
    try {
        const {email} = req.decoded;
        const { google_list_id } = req.query;

        // Retrieve user data
        const userData = await knex('googleUsers').where({ email }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        let Udata;
        try {
            Udata = JSON.parse(userData.data);
        } catch (error) {
            return res.status(500).json({ message: 'Error parsing user data' });
        }

        // Check if google_list_id exists in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Retrieve sections for the specified google_list_id
        const sections = Udata.google_lists[google_list_id].sections || {};

        res.status(200).json({ message: 'Sections retrieved successfully', sections:Object.values(sections) });
    } catch (error) {
        console.error('Error retrieving Google list sections:', error);
        res.status(500).json({ message: 'Failed to retrieve Google list sections' });
    }
};

exports.getTasksbyId = async (req, res) => {
    try {
        const {google_list_id} = req.query

        const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

        const tasks = await tasksApi.tasks.list({ tasklist: google_list_id });
        const data = tasks.data.items

        res.status(200).json({ message: 'tasks retrieved successfully', data});

    } catch (error) {
        console.error('Error retrieving Google tasks :', error);
        res.status(500).json({ message: 'Failed to retrieve Google tasks' });
    }
};

exports.addList = async (req, res) =>{
   try{
      const { title } = req.body;
      const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
      const response = await tasksApi.tasklists.insert({
        requestBody: {
            title
        }
      })
      res.status(200).json({
        message:"List added successfully",
        data: response.data
      })

   }catch(error) {
    console.error('Error creating list:', error);
    res.status(500).json({
        message: "Failed  to create list"
    });
  }
}

 exports.addTask = async(req, res) =>{
    try{
      const { tasklistId } = req.params;
      const { title, notes, due } = req.body;

      if (!tasklistId || !title) {
        return res.status(400).json({ message: "Task list ID and title are required." });
    }
      const dueDate = due ? new Date(due).toISOString() : new Date().toISOString();

      const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

      const taskData = {
        title,
        notes,
        due: dueDate
      }

      const response = await tasksApi.tasks.insert({
          tasklist: tasklistId,
          requestBody: taskData
      })

      res.status(200).json({
        message: "Task added successfully",
        data: response.data
      })
    }catch(e){
        console.error("Failed to create task",e)
        res.status(500).json({
            message: "Failed to create task"
        })
    }
 }