const express = require("express");
require('dotenv').config();
var fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = `./uploads/${req.params.address}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, `./uploads/${req.params.address}`);
  },
  filename: function (req, file, cb) {
    let fileName = file.originalname.split('.');
    cb(null, `${file.fieldname}.${fileName[fileName.length - 1]}`);
  }
});

const fileFilter = (req, file, cb) => {
  // reject a file
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/gif' || file.mimetype === 'image/svg' || file.mimetype === 'image/webp' || file.mimetype === 'image/svg+xml') {
    cb(null, true);
  }
  else {
    cb(new Error('File type not accepted'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

const databaseName = process.env.MONGO_DATABASE_NAME;

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = (require("./connect"));

// This help convert the id from string to ObjectId for the _id.
const ObjectId = require("mongodb").ObjectId;

//crypt data to send front end
const crypto = require('crypto');

const algorithm = 'aes-256-ctr';
const secret = process.env.SECRET
const iv = crypto.randomBytes(16).toString('hex').slice(0, 16);

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, secret, iv);
  const encrypted = cipher.update(String(text), 'utf8', 'hex') + cipher.final('hex');
  return iv + ':' + encrypted;
}

//-----------------------------------------------------------------------
// ROUTES
//-----------------------------------------------------------------------

// This section will help you get a list of all routes.
recordRoutes.route("/routes/list").get(function (req, res) {
  let db_connect = dbo.getDb(databaseName);
  db_connect
    .collection("routes")
    .find({})
    .toArray(function (err, result) {
      if (err) throw err;
      result = encrypt(JSON.stringify(result));
      res.json(result);
    });
});


//-----------------------------------------------------------------------
// USERS
//-----------------------------------------------------------------------

// This section will help you get a single user by address
recordRoutes.route("/user/:address").get(function (req, res) {
  let db_connect = dbo.getDb(databaseName);
  let myquery = { _id: { $regex: req.params.address, $options: "i" } };
  db_connect
    .collection("users")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      result = encrypt(JSON.stringify(result));
      res.json(result);
    });
});

// This section will help you get a single user by username
recordRoutes.route("/user/name/:username").get(function (req, res) {
  let db_connect = dbo.getDb(databaseName);
  let myquery = { username: { $regex: req.params.username, $options: "i" } };
  db_connect
    .collection("users")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      result = encrypt(JSON.stringify(result));
      res.json(result);
    });
});

// This section will help you create a new usern first time
recordRoutes.route("/user/addFirst").post(function (req, res) {
  let db_connect = dbo.getDb(databaseName);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 
  const date = new Date();
  let myobj = {
    _id: req.body.id,
    showNft: false,
    lastLogin: date,
    registration: date,
    lastEdit: date,
    bio: null,
    username: null,
    profilePic: null,
    coverPic: null,
    email: null,
    ip : ip,
  };
  let robj = {
    _id: req.body.id,
    username: null,
  }
  db_connect
    .collection("users")
    .insertOne(myobj, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
  db_connect
    .collection("routes")
    .insertOne(robj, function (err, result) {
      if (err) throw err;
    });
});

// This section will help you update a login of users.
recordRoutes.route("/user/lastLogin/:address").post(function (req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 

  let db_connect = dbo.getDb(databaseName);
  let myquery = { _id: { $regex: req.params.address, $options: "i" } };
  let newvalues = {
    $set: {
      lastLogin: new Date(),
      ip : ip
    },
  };
  db_connect
    .collection("users")
    .updateOne(myquery, newvalues, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

// This section will help you update a information of users.
recordRoutes.route("/user/update/:address").post(upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'coverPic', maxCount: 1 }]), function (req, res) {
  let obj = null;
  if (req.body.social) {
    obj = JSON.parse(req.body.social);
  }
  let db_connect = dbo.getDb(databaseName);
  let myquery = { _id: { $regex: req.params.address, $options: "i" } };
  let newvalues = {
    $set: {
      lastEdit: new Date(),
      username: req.body.username,
      bio: req.body.bio,
      email: req.body.email,
      showNft: req.body.showNft ? true : false,
      profilePic: req.files ? req.files.profilePic ? 'https://api.dreamhunter.io/' + req.files.profilePic[0].path : (req.body.profilePic ? req.body.profilePic : null) : (req.body.profilePic ? req.body.profilePic : null),
      coverPic: req.files ? req.files.coverPic ? 'https://api.dreamhunter.io/' + req.files.coverPic[0].path : (req.body.coverPic ? req.body.coverPic : null) : (req.body.coverPic ? req.body.coverPic : null),
      social: obj,
    },
  };
  let rvalues = {
    $set: {
      username: req.body.username,
    },
  };
  db_connect
    .collection("users")
    .updateOne(myquery, newvalues, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
  db_connect
    .collection("routes")
    .updateOne(myquery, rvalues, function (err, result) {
      if (err) throw err;
    });
});

//-----------------------------------------------------------------------
// WHITELIST
//-----------------------------------------------------------------------

//-----------------------------------------------------------------------
// DREAMCARDS
//-----------------------------------------------------------------------

// This section will help you get a Dream Hunters Card remained
recordRoutes.route("/dreamCard").get(function (req, res) {
  let db_connect = dbo.getDb(databaseName);
  let myquery = { _id: ObjectId("62286f85281588f607663645") };
  db_connect
    .collection("dreamCards")
    .findOne(myquery, function (err, result) {
      if (err) throw err;
      res.json(result);
    });
});

//-----------------------------------------------------------------------
// PAYMENT STRIPE
//-----------------------------------------------------------------------

const ethers = require('ethers');
const CONTRACT_ADDRESS = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
const CONTRACT_ABI = require('./lib/whitelistCristiano.json');
const rpcProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, rpcProvider);
const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2019-09-09; orders_beta=v3'
});
let endpointSecret = null;

// Create an endpoint to handle payment_intent.succeeded
stripe.webhookEndpoints.create({
  url: 'https://api.dreamhunter.io/stripe/webhook',
  enabled_events: [
    'payment_intent.succeeded',
  ],
}).then(function (result) {
  endpointSecret = result.secret;
});

// Calculate the order total on the server to prevent
// people from directly manipulating the amount on the client
const calculateOrderAmount = (n) => {
  return 300 * parseInt(n);
};

// This calculation takes into account stripe's payment fees
// Bad case: 3% + 0.30 per transaction
// Formula: price = (initial_price + fixed_tax) / (1 - percentage_tax)
const calculateOrderAmmountFee = (n) => {
  return parseInt((calculateOrderAmount(n) + 30) / (1 - 0.03));
};

// Add an endpoint that creates an Order and returns the client secret. 
/*
recordRoutes.route("/stripe/create-order/").post(async (req, res) => {

  const product = req.body.product;
  const qty = req.body.qty;
  const description = req.body.description;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress 

  const order = await stripe.orders.create({
    ip_address: ip,
    currency: 'usd',
    line_items: [{ product: product, quantity: qty }],
    description: description,
    payment: {
      settings: {
        payment_method_types: ['card'],
      },
    },
    automatic_tax: {
      enabled: true,
    },
  });

  res.send({
    clientSecret: order.client_secret,
  });

});
*/

recordRoutes.route("/create-payment-intent").post(async (req, res) => {
  const qty = req.body.qty;
  const description = req.body.description;

  // Alternatively, set up a webhook to listen for the payment_intent.succeeded event
  // and attach the PaymentMethod to a new Customer
  const customer = await stripe.customers.create();

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    customer: customer.id,
    amount: calculateOrderAmmountFee(qty),
    description: description,
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    // Quando imposti il valore request_three_d_secure su any, Stripe impone al cliente di eseguire l’autenticazione per completare il pagamento se l’autenticazione 3DS è disponibile per una carta. 
    payment_method_options: {
      card: {
        request_three_d_secure: "any"
      }
    },
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

recordRoutes.route("/stripe/retrieve/:id").post(async (req, res) => {
  const id = req.params.id;

  const paymentIntent = await stripe.paymentIntents.retrieve(id);
  res.json(paymentIntent);

});

recordRoutes.route('/stripe/webhook').post(express.raw({ type: 'application/json' }), async function (request, response) {
  let event = request.body;
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (endpointSecret) {

    // Get the signature sent by Stripe
    const signature = request.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        // Use process.env.STRIPE_WEBHOOK_SECRET on local development
        // process.env.STRIPE_WEBHOOK_SECRET
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  // Connect to database
  let db_connect = dbo.getDb(databaseName);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`🔔  Payment received!`);
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      const detail = paymentIntent.description.split(';');
      const address = detail[1];
      const qty = parseInt(detail[2]);
      const usdt = (parseInt(paymentIntent.amount) * 10000).toString();

      const tnx = await connectedContract.purchase(address, qty, paymentIntent.id, '0', usdt, 'stripe')

      await tnx.wait();

      hash = tnx.hash;

      let myobj = {
        _id: paymentIntent.id,
        hash: hash,
        address: address,
        description: paymentIntent.description,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        billing_details: {
          address: paymentIntent.charges.data[0].billing_details.address.country,
          name: paymentIntent.charges.data[0].billing_details.name,
          email: paymentIntent.charges.data[0].billing_details.email,
        },
        payment_method_details: paymentIntent.charges.data[0].payment_method_details,
        receipt_email: paymentIntent.receipt_email,
        timestamp: paymentIntent.created,
        status: paymentIntent.status,
        qty: qty,
      };

      db_connect
        .collection("stripeTransaction")
        .insertOne(myobj, function (err, r) {
          if (err) throw err;
        });

      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});




module.exports = recordRoutes;