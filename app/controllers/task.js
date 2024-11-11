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
        console.log('Request received at /tasks/list');

        const token = req.cookies.jwt;
        console.log('JWT Token:', token);

        if (!token) {
            return res.status(401).json({ message: 'No token provided, user is not authenticated' });
        }

        // Decode JWT Token
        let decoded;
        try {
            decoded = jwt.verify(token, 'your_jwt_secret');
            console.log('Decoded JWT:', decoded);
        } catch (err) {
            console.error('JWT Verification failed:', err);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const email = decoded.email;
        console.log('Email from token:', email);

        // Initialize Google API client
        const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });
        const taskLists = await tasksApi.tasklists.list();
        console.log('Google Task Lists:', taskLists);

        // Check if task lists are returned
        if (!taskLists.data.items || taskLists.data.items.length === 0) {
            console.log('No task lists found.');
            return res.status(404).json({ message: 'No task lists found' });
        }

        const lists = taskLists.data.items;

        // Check if email exists in the token
        if (!email) {
            console.log('Email not found in token');
            return res.status(401).json({ message: 'User not authenticated' });
        }

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
                    sublists: {}
                };
            }
        });

        // Save updated user data back to DB
        console.log('Saving updated user data to DB...');
        await knex('googleUsers').where({ email }).update({ data: JSON.stringify(Udata) });

        const googleList = Udata.google_lists;
        console.log('Google Lists (Udata.google_lists):', googleList);

        const basesublists = Object.keys(googleList).map(listId => {
            console.log(`Processing list ID: ${listId}`);
            return {
                ...googleList[listId],
                listid: listId,
                sublists: Object.values(googleList[listId].sublists || {}).map(sublist => {
                    console.log(`Processing sublist: ${sublist.sublist_name}`);
                    return sublist.sublist_name;
                })
            };
        });

        console.log('Basesublists:', basesublists);

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
        // Retrieve the user email from the cookie
        const token = req.cookies.jwt;
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const userEmail = decoded.email;

        if (!userEmail) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const { google_list_id, sublist_name } = req.body;

        // Fetch existing data from the 'googleUsers' table
        let userData = await knex('googleUsers').where({ email: userEmail }).first();

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
        await knex('googleUsers').where({ email: userEmail }).update({ data: JSON.stringify(Udata) });

        res.status(201).json({ message: 'Sublist added successfully', data: Udata });
    } catch (error) {
        console.error('Error adding sublist:', error);
        res.status(500).json({ message: 'Failed to add sublist' });
    }
};


exports.getAllSublists = async (req, res) => {

    try {
        const { google_list_id } = req.query;

        // Retrieve the user email from the cookie
        // const userEmail = req.cookies.email; // Assuming the email is saved as a cookie called 'userEmail'

        const token = req.cookies.jwt;
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const userEmail = decoded.email;
        console.log(userEmail);

        if (!userEmail) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Fetch the user's data from the 'googleUsers' table
        const userData = await knex('googleUsers').where({ email: userEmail }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        const Udata = userData.data;

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

        res.render('dashboard', {
            baselists: [],
            basesublists: Object.values(sublists)
        });
        // res.status(200).json({ message: 'Sublists retrieved successfully', data: sublists });
    } catch (error) {
        console.error('Error retrieving sublists:', error);
        res.status(500).json({ message: 'Failed to retrieve sublists' });
    }
};


exports.addSection = async (req, res) => {
    try {
        const { google_list_id, userEmail, subListId, section_name } = req.body;

        // Fetch existing data from the 'googleUsers' table
        const userData = await knex('googleUsers').where({ email: userEmail }).first();

        if (!userData || !userData.data) {
            return res.status(404).json({ message: 'User data not found' });
        }

        let Udata = userData.data;

        // Check if the google_list_id and subListId exist in the user's data
        if (!Udata.google_lists || !Udata.google_lists[google_list_id]) {
            return res.status(404).json({ message: 'List not found' });
        }
        if (!Udata.google_lists[google_list_id].sublists[subListId]) {
            return res.status(404).json({ message: 'Sublist not found' });
        }

        // Generate a unique section ID
        const section_id = Date.now().toString();

        // Add the new section to the specified sublist
        Udata.google_lists[google_list_id].sublists[subListId].sections[section_id] = {
            section_id,
            section_name
        };

        // Update the user data in the 'googleUsers' table
        await knex('googleUsers').where({ email: userEmail }).update({ data: JSON.stringify(Udata) });

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
        const UserData = lists
        res.status(200).send({ message: "all tasks here", UserData })

    } catch (error) {
        console.error('Error getting sublist:', error);
        res.status(500).json({ message: 'Failed to get Lists' });
    }
}