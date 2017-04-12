CREATE DATABASE hellco_video;
USE hellco_video;
CREATE TABLE users (user VARCHAR(20), ipAddr VARCHAR(30), userID VARCHAR(30), userPrivilege INT, userPenalty INT, timeStamp BIGINT, streamurl VARCHAR(50));
CREATE TABLE lastmessages (user VARCHAR(20), message TEXT, timestamp BIGINT);
CREATE TABLE banlist (ip VARCHAR(30), expiretime BIGINT);
