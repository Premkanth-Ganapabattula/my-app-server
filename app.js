const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const cors = require('cors');
const path = require('path')
const uuid = require('uuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const multer = require('multer')
const { emitWarning, allowedNodeEnvironmentFlags } = require('process');

const app = express()

app.use(express.json())

app.use(cors({ origin: 'http://localhost:3000' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const databasePath = path.join(__dirname, 'myDB.db')

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(8080, () =>
      console.log('Server Running at http://localhost:8080/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

// authentication middleware function
function authenticateToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.json({error: 'Invalid JWT Token'})
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.json({error: 'Invalid JWT Token'})
      } else {
        next()
      }
    })
  }
}

//User

app.post('/registration/', async (request, response) => {
  const {firstName, lastName, emailId, phoneNumber, password, dateOfBirth, gender} = request.body;

  const checkingPhoneNUmberQuary = `SELECT * FROM users WHERE phone_number = '${phoneNumber}';`
  const checkingPhoneNUmber = await database.get(checkingPhoneNUmberQuary)
  const checkingEmailIdQuary = `SELECT * FROM users WHERE email_id = '${emailId}';`
  const checkingEmailId = await database.get(checkingEmailIdQuary)
  if (checkingEmailId !== undefined){
    response.status(400)
    response.send({error: "Email Already exits"})
  } else if (checkingPhoneNUmber !== undefined) {
    response.status(400)
    response.send({error: "Mobile Number Already exits"})
  } else if (checkingEmailId === undefined && checkingPhoneNUmber === undefined){
    let dateOfBrithInString = dateOfBirth.toString()
    const id = uuid.v4();
    bcrypt.hash(password, 10, async(error, hashedPassword) => {
      if (error) {
          response.json(error)
      } else {
          const addingUserDetailsQuary = `INSERT INTO
                                      users (id, first_name, last_name, email_id, phone_number, password, date_of_birth, gender)
                                    VALUES ('${id}', '${firstName}', '${lastName}', '${emailId}', '${phoneNumber}', '${hashedPassword}', '${dateOfBrithInString}', '${gender}');`
          const payload = {
            username: emailId,
          }
          const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
          await database.run(addingUserDetailsQuary);   
          response.status(200);
          response.send({jwtToken, id})                 
      }
    })
  }  
})

app.get('/profile/upload/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM users WHERE id='${userId}';`
  const userDetails = await database.get(gettingFirstNameQueary);
  if (userDetails !== undefined){
    response.json({userDetails: userDetails});
  }  
})

app.get('/user/additional/details/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM user_additional_details WHERE user_id='${userId}';`
  const userDetails = await database.get(gettingFirstNameQueary);
  if (userDetails !== undefined){
    response.json({userDetails: userDetails});
  }  
})

app.get('/user/details/:userId', authenticateToken, async(request, response) => {
  const userId = request.params.userId;
  const gettingFirstNameQueary = `SELECT * FROM user_additional_details inner join users on user_additional_details.user_id = users.id WHERE user_id NOT LIKE '${userId}' AND user_id NOT IN (
                                      SELECT request_sent_to FROM friend_request_table
                                    );`
  const userDetails = await database.all(gettingFirstNameQueary);
  if (userDetails !== undefined){
    response.json({userDetails: userDetails});
  }  
})


const storage = multer.memoryStorage({limits: {
  fileSize: 1024 * 1024 * 10, // 10MB for example
  fieldSize: 1024 * 1024 * 10, // 10MB for example
}}); 
const upload = multer({ storage: storage });

app.post('/user/additional/details/', authenticateToken, upload.single('profilePhoto'), async(request, response) =>  {
  try {
    const { profilePhoto, userId, username, bio, relationshipStatus } = request.body;
    //const profilePhotoBuffer = request.file.buffer;
    const addingAdditionalDetailesQueary = `INSERT INTO 
                                              user_additional_details(id, user_id, username, bio, relationship_status, profile_photo)
                                           VALUES ('${uuid.v4()}', '${userId}', '${username}', "${bio}", '${relationshipStatus}', '${profilePhoto}');`
    await database.run(addingAdditionalDetailesQueary);
    response.status(200).json({ message: 'Upload Success'});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/friend/request/', authenticateToken, async(request, response) => {
  try {
    const {requestSentBy, requestSentTo, utcTime} = request.body
    const addingFriendRequestQuery = `INSERT INTO
                                        friend_request_table(friend_request_table_id, request_sent_by, request_sent_to, time_date)
                                      VALUES ('${uuid.v4()}', '${requestSentBy}', '${requestSentTo}', '${utcTime}');`
    await database.run(addingFriendRequestQuery);
    response.status(200).json({ message: 'Upload Success'});
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/delete/friend/request/', authenticateToken, async(request, response) => {
  try {
    const {requestSentBy, requestSentTo} = request.body
    const deletingFriendRequestQuery = `DELETE from friend_request_table where request_sent_by='${requestSentBy}' AND request_sent_to = '${requestSentTo}';`
    await database.run(deletingFriendRequestQuery);
    response.status(200).json({ message: 'Deleted Success'});    
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM users WHERE email_id = '${username}';`
  const databaseUser = await database.get(selectUserQuery)
  if (databaseUser === undefined) {
    response.status(400)
    response.send({error: "Invalid User"})
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password,
    )
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      const id = databaseUser.id
      response.send({jwtToken, id})
    } else {
      response.status(400)
    response.send({error: 'Invalid password'})
    }
  }
})

/*app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state;`
  const statesArray = await database.all(getStatesQuery)
  response.send(
    statesArray.map(eachState =>
      convertStateDbObjectToResponseObject(eachState),
    ),
  )
})

app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT 
      *
    FROM 
      state 
    WHERE 
      state_id = ${stateId};`
  const state = await database.get(getStateQuery)
  response.send(convertStateDbObjectToResponseObject(state))
})

app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictsQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};`
    const district = await database.get(getDistrictsQuery)
    response.send(convertDistrictDbObjectToResponseObject(district))
  },
)

app.post('/districts/', authenticateToken, async (request, response) => {
  const {stateId, districtName, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `
  INSERT INTO
    district (state_id, district_name, cases, cured, active, deaths)
  VALUES
    (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`
  await database.run(postDistrictQuery)
  response.send('District Successfully Added')
})

app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId} 
  `
    await database.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrictQuery = `
  UPDATE
    district
  SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active}, 
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
  `

    await database.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStateStatsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`
    const stats = await database.get(getStateStatsQuery)
    response.send({
      totalCases: stats['SUM(cases)'],
      totalCured: stats['SUM(cured)'],
      totalActive: stats['SUM(active)'],
      totalDeaths: stats['SUM(deaths)'],
    })
  },
)*/

module.exports = app
