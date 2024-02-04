-- Users table quearies 

/* create table users(
    id TEXT NOT NULL PRIMARY KEY,
    first_name VARCHAR(250),
    last_name VARCHAR(250),
    email_id VARCHAR(250),
    phone_number VARCHAR(250),
    password text NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(100)
); */

--SELECT name FROM sqlite_master;

/*INSERT INTO users 
    (id, first_name, last_name, email_id, phone_number, password, date_of_birth, gender)
VALUES (2, 'prem', 'kanth', 'premkanth@gmail.com', '9089674534', 'Premkanth@19', 02-02-1999, 'Male'); */

--SELECT * from user_additional_details;

--drop table user_additional_details;

--delete from user_additional_details where bio = 'hi';

-- user addtional details 

--PRAGMA foreign_keys = ON;

/* create table user_additional_details (
    id INT NOT NULL PRIMARY KEY,
    user_id INT,
    username VARCHAR(250),
    bio TEXT,
    relationship_status VARCHAR(250),
    profile_photo TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); */

/* create table friend_request_table (
    friend_request_table_id INT NOT NULL PRIMARY KEY,
    request_sent_by INT,
    request_sent_to INT,
    time_date DATETIME,
    FOREIGN KEY (request_sent_by) REFERENCES user_additional_details(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_sent_to) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */

--select * from friend_request_table;
delete from friend_request_table;