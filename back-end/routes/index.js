var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var config = require('../config/config.js');
var bcrypt = require('bcrypt-nodejs');
var randtoken = require('rand-token');
var stripe = require('stripe')(config.stripeToken);
// MySql module
var mysql  = require('mysql');
var connection = mysql.createConnection({
    host     : config.host,
    user     : config.username,
    password : config.password,
    database : config.database
});
connection.connect();

// Multer module
var multer = require('multer');
var upload = multer({dest: 'public/images'});
var type = upload.single('imgFile');
var fs = require('fs');


function getStuff(id){
    return new Promise(function(resolve,reject){
        var query = "SELECT * FROM auctions WHERE id="+id;
        connection.query(query,(error,results,fields)=>{
            if(error) return reject(error);
            // console.log(results);
            resolve(results);
        });
    });
}

var auctionsArray = [];
for(let x=1;x<6;x++){
    auctionsArray.push(getStuff(x));
}

// Promise.all(auctionsArray).then(contentsOfPromises=>{
//     console.log(contentsOfPromises);    
// })

auctionsArray[0].then((theResults)=>{
    console.log(theResults);
    auctionsArray[1].then((theResults2)=>{
        console.log(theResults2);
    })
})



// GET all auctions
router.get('/getHomeAuctions/:subcat', (req, res, next) => {
    console.log(req.params.subcat);
    if (req.params.subcat == "Home") {
        var auctionsQuery = `SELECT * FROM auctions INNER JOIN images on images.auction_id=auctions.id`;
    } else {
        var auctionsQuery = `SELECT * FROM auctions INNER JOIN images on images.auction_id=auctions.id INNER JOIN categories ON auctions.category_id=categories.id WHERE categories.category_name='${req.params.subcat}'` ;
        console.log(auctionsQuery);
    }
    connection.query(auctionsQuery, (error, results, fields) => {
        if (error) throw error;
        res.json(results);
    });
});


// Get all the user's listings
router.post('/myListings', (req, res, next) => {
    var token = req.body.token
    var getUserQuery = `SELECT id FROM users WHERE token=?`;
    connection.query(getUserQuery, [token], (error1, results1) => {
        if (error1) throw error1;
        let userId = results1[0].id;
        var myListingsQuery = `SELECT * FROM auctions INNER JOIN images on images.auction_id=auctions.id WHERE user_id=?`;
        connection.query(myListingsQuery, [userId], (error2, results2) => {
            if (error2) throw error2;
            if (results2.length === 0) {
                res.json({
                    msg: 'noListings'
                });
            } else {
                res.json(results2);
            }
        });
    });
});


// Login authentification
router.post('/login', (req, res, next) => {
    var username = req.body.username;
    var password = req.body.password;
    var checkLoginQuery = `SELECT * FROM users WHERE username=?`;
    connection.query(checkLoginQuery, [username], (error, results) => {
        if (error) throw error;
        if (results.length === 0) {
            res.json({
                isLoggedIn: false,
                msg: 'badUsername' // Not a valid username
            });
        } else {
            checkHash = bcrypt.compareSync(password, results[0].password);
            if (checkHash) {
                var token = randtoken.uid(40);
                var insertToken = `UPDATE users SET token=?, token_exp=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE username=?`;
                connection.query(insertToken, [token, username], (error2, results2) => {
                    res.json({
                        isLoggedIn: true,
                        msg: 'loginSuccess',
                        name: results[0].username,
                        token: token // Found user and password is validated
                    });
                });
            } else {
                res.json({
                    isLoggedIn: false,
                    msg: 'wrongPassword' // Found user but password doesn't match
                });
            }
        }
    });
});


// Logout user by destroying the auth token
router.post('/logout', (req, res, next) => {
    var token = req.body.token;
    var destroyTokenQuery = `UPDATE users SET token=NULL, token_exp=NULL WHERE token=?`;
    connection.query(destroyTokenQuery, [token], (error, results) => {
        if (error) throw error;
        console.log(results);
        res.json({
            isLoggedIn: false
        });
    });
});


// Make a register post route to handle registration!
router.post('/register', (req, res, next)=>{
    var name = req.body.name;
    var username = req.body.username;
    var email = req.body.email;
    var password = bcrypt.hashSync(req.body.password);

    var checkDupeUserQuery = 'SELECT * FROM users WHERE username=?';
    connection.query(checkDupeUserQuery, [username], (dupeError, results, fields) => {
        if (dupeError) throw dupeError;
        if (results.length === 0) {
            var insertUserQuery = 'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)';
            connection.query(insertUserQuery, [name, username, email, password], (insertError, results, fields) => {
                if (insertError) throw insertError;
                res.json({
                    msg: 'userInserted'
                });
            });
        } else {
            res.json({
                msg: 'userNameTaken'
            });
        }
    });
});


// Create a listing (user must be logged in)
router.post('/createListing', type, (req, res, next) => {
    var token = req.body.token;
    var title = req.body.title;
    var desc = req.body.description;
    var usd = req.body.usd;
    var end = req.body.end;
    var start = req.body.start;
    var userId = '';
    var auctionId = '';
    var tempPath = req.file.path;
    var imgName = req.file.originalname;
    var targetPath = `public/images/${imgName}`;

    var getUserQuery = `SELECT id FROM users WHERE token = ?`;
    connection.query(getUserQuery, [token], (error1, results1) => {
        if (error1) throw error1;
        userId = results1[0].id;
        var insertListingQuery = `INSERT INTO auctions (user_id, title, description, starting_bid, current_bid, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        connection.query(insertListingQuery, [userId, title, desc, usd, usd, start, end], (error2, results2) => {
            if (error2) throw error2;
            auctionId = results2.insertId;
            var insertImgQuery = `INSERT INTO images (auction_id, url) VALUES (?, ?)`;
            fs.readFile(tempPath, (readError, readContents) => {
                fs.writeFile(targetPath, readContents, (writeError) => {
                    if (writeError) throw writeError;
                    connection.query(insertImgQuery, [auctionId, imgName], (error3, results3) => {
                        if (error3) throw error3;
                        fs.unlink(tempPath, (unlinkError) => {
                            if (unlinkError) throw unlinkError;
                            res.json({
                                msg: `Listing ${auctionId} created`
                            });
                        });
                    });
                });
            });
        });
    });
});


// GET the listing item for the item's detail page
router.get('/getListingItem/:listingId', (req, res, next) => {
    var listingId = req.params.listingId;
    var getListingQuery = `SELECT * FROM auctions LEFT JOIN images on images.auction_id = auctions.id LEFT JOIN users on users.id = auctions.user_id WHERE auctions.id = ?`;
    connection.query(getListingQuery, [listingId], (error, results) => {
        if (error) throw error;
        res.json(results);
    });
});


// Submit bid post
router.post('/submitBid', (req, res, next) => {
    var bid = req.body.bidAmount;
    var id = req.body.listingId;
    var bidder = req.body.userToken;
    var selectBidQuery = `SELECT current_bid FROM auctions WHERE id = ?`;
    connection.query(selectBidQuery, [id], (error, results) => {
        if ((bid < results[0].current_bid) || (bid < results[0].starting_bid)) {
            res.json({
                msg: 'bidTooLow'
            });
        } else {
            // Bid is successful (not too low)
            var getUserQuery = `SELECT id FROM users WHERE token = ?`;
            connection.query(getUserQuery, [bidder], (error2, results2) => {
                if (results2.length > 0) {
                    var insertBidQuery = `UPDATE auctions SET high_bidder_id = ?, current_bid = ? WHERE id = ?)`;
                    connection.query(insertBidQuery, [results2[0].id, bid, id], (error3, results3) => {
                        if (error3) throw error3;
                        res.json({
                            msg: 'bidSuccess',
                            newBid: bid
                        });
                    });
                }
            });
        }
    });
});


// Post stripe token
router.post('/stripe', (req, res, next) => {
    var user = req.body.userToken;
    stripe.charges.create({
        amount: req.body.amount,
        currency: 'usd',
        source: req.body.stripeToken,
        description: 'Charges for asdf@example.com'
    }, (err, charge) => {
        if (err) {
            res.json({
                msg: 'errorProcessing'
            });
        } else {
            res.json({
                msg: 'paymentSuccess'
            });
        }
    });
});

module.exports = router;
