// Imports
const express = require('express');
const webRoutes = require('./routes/web');

// Session imports
let cookieParser = require('cookie-parser');
let session = require('express-session');
let flash = require('express-flash');
let passport = require('passport');

// Express app creation
const app = express();

// Socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);

// Configurations
const appConfig = require('./configs/app');

// View engine configs
const exphbs = require('express-handlebars');
const hbshelpers = require("handlebars-helpers");
const multihelpers = hbshelpers();
const extNameHbs = 'hbs';
const hbs = exphbs.create({
  extname: extNameHbs,
  helpers: multihelpers
});
app.engine(extNameHbs, hbs.engine);
app.set('view engine', extNameHbs);

// Session configurations
let sessionStore = new session.MemoryStore;
app.use(cookieParser());
app.use(session({
  cookie: { maxAge: 60000 },
  store: sessionStore,
  saveUninitialized: true,
  resave: 'true',
  secret: appConfig.secret
}));
app.use(flash());

// Configuraciones de passport
require('./configs/passport');
app.use(passport.initialize());
app.use(passport.session());

// Receive parameters from the Form requests
app.use(express.urlencoded({ extended: true }))

app.use('/', express.static(__dirname + '/public'));

// Routes
app.use('/', webRoutes);

// Game
names = [
  "Aardvark", "Albatross", "Alligator", "Alpaca", "Ant", "Anteater", "Antelope", "Ape", "Armadillo", "Donkey",
  "Baboon", "Badger", "Barracuda", "Bat", "Bear", "Beaver", "Bee", "Bison", "Boar", "Buffalo",
  "Butterfly", "Camel", "Capybara", "Caribou", "Cassowary", "Cat", "Caterpillar", "Cattle", "Chamois", "Cheetah",
  "Chicken", "Chimpanzee", "Chinchilla", "Chough", "Clam", "Cobra", "Cockroach", "Cod", "Cormorant", "Coyote",
  "Crab", "Crane", "Crocodile", "Crow", "Curlew", "Deer", "Dinosaur", "Dog", "Dogfish", "Dolphin",
  "Dotterel", "Dove", "Dragonfly", "Duck", "Dugong", "Dunlin", "Eagle", "Echidna", "Eel", "Eland",
  "Elephant", "Elk", "Emu", "Falcon", "Ferret", "Finch", "Fish", "Flamingo", "Fly", "Fox",
  "Frog", "Gaur", "Gazelle", "Gerbil", "Giraffe", "Gnat", "Gnu", "Goat", "Goldfinch", "Goldfish",
  "Goose", "Gorilla", "Goshawk", "Grasshopper", "Grouse", "Guanaco", "Gull", "Hamster", "Hare", "Hawk",
  "Hedgehog", "Heron", "Herring", "Hippopotamus", "Hornet", "Horse", "Human", "Hummingbird", "Hyena", "Ibex",
  "Ibis", "Jackal", "Jaguar", "Jay", "Jellyfish", "Kangaroo", "Kingfisher", "Koala", "Kookabura", "Kouprey",
  "Kudu",
];

adjectives =["happy", "rotating", "red", "fast", "elastic", "smily", "unbelievable", "infinite"];
 
letters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", 
  "t", "u", "v", "w", "x", "y", "z",];

var players = []; // clients
var ingame = [];
var waitingRoom = [];
var playingRoom = [];
var gameHasStarted = false;
var gameAnswers = [];
var points;
var letter;
var unmatched;

io.on('connection', (socket) => {
  let id = socket.id;

  console.log(`New player connected, ID: ${socket.id}`);
  players[socket.id] = socket;
  playerName = createPlayerName();
  console.log(playerName);
  
  socket.emit('toast', {message: `Jugador ${playerName} se ha conectado al servidor`});
  socket.emit('displayName', {player: playerName});

  // When this socket(player) disconnects
  socket.on("disconnect", () => {
    console.log(`Player disconnected, ID: ${socket.id}`);
    delete players[socket.id];
    delete playingRoom[socket.id];
    delete waitingRoom[socket.id];
    // socket.broadcast.emit(`Player ${playerName} disconnected`);
    if(opponentOf(socket)) {
      opponentOf(socket).emit("opponentLeft");
      io.emit('sendPlayerRoom', {room: playingRoom});
      io.emit('sendWaitingRoom', {room: waitingRoom});
    }
  });

    // // Inform when the opponent disconnects
  // socket.on("disconnect", function() {
  //   if(opponentOf(socket)) {
  //     opponentOf(socket).emit("opponent.left");
  //   }
  // });

  addPlayer(socket, playerName);
  io.emit('sendPlayerRoom', {room: playingRoom});
  io.emit('sendWaitingRoom', {room: waitingRoom});

  // if the player has an opponent
  if(opponentOf(socket)) {
    let count = 5;
    var startCountdown = setInterval(() => {
      io.emit('toast', {message: `El juego comienza en ${count}`});
      count--;
      if(count === 0) {
        gameHasStarted = true;
        letter = chooseLetter();
        io.emit('beginGame', {letter: letter});
        clearInterval(startCountdown);
      }
    }, 1000);
  }
  
  socket.on("getBasta", function() {
    io.emit('toast', {message: `Jugador dijo basta`});
    io.emit('receiveBasta');
    let count = 10;
    var startCountdown = setInterval(() => {
      io.emit('toast', {message: `El juego termina en ${count}`});
      count--;
      if(count === 0) {
        gameHasStarted = false;
        io.emit('sendAnswers');
        clearInterval(startCountdown);
      }
    }, 1000);

  });
  
  socket.on("sendToServer", function(data) {
    gameAnswers.push(data.answer)
    // console.log(gameAnswers);
    
    if(gameAnswers.length == 2) {
      checkAnswers(gameAnswers, socket);

      var player1 = ingame[socket.id];
      var player2 = ingame[ingame[socket.id].opponent];
      var winner = ''

      if(player1.score > player2.score) {
        winner = `${player1.name}`;
      } else if(player1.score < player2.score) {
        winner = `${player2.name}`;
      } else if(player1.score == player2.score) {
        winner = 'Draw!';
      }

      let result = {
        winner: winner,
        playerName1: player1.name,
        playerName2: player2.name,
        playerScore1: player1.score,
        playerScore2: player2.score
      }
  
      io.emit('showResults', {result: result});
    }
  });

});

// App init
server.listen(appConfig.expressPort, () => {
  console.log(`Server is listenning on ${appConfig.expressPort}! (http://localhost:${appConfig.expressPort})`);
});

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

function createPlayerName() {
  shuffle(adjectives);
  shuffle(names);
  playerName = adjectives[0] + names[0];
  return playerName;
}

function chooseLetter() {
  shuffle(letters);
  selectedLetter = letters[0];
  return selectedLetter.toUpperCase();
}

function addPlayer(socket, playerName) {
  ingame[socket.id] = {
    name: playerName,
    opponent: unmatched,
    score: 0,
    socket: socket
  }

  // if there exists already a player waiting
  if(unmatched) {
    ingame[unmatched].opponent = socket.id;
    unmatched = null;
    waitingRoom.push(playerName);

    // if there are enough players to send them to playing Room
    if (waitingRoom.length >= 2 && playingRoom.length == 0) {
      playersIngame = waitingRoom.splice(0,2);
      playingRoom.push(playersIngame);
    }
  } 
  // if there are no players waiting
  else {
    unmatched = socket.id;
    waitingRoom.push(playerName);
  }
}

function opponentOf(socket) {
  if(!ingame[socket.id].opponent) {
    return;
  }
  return ingame[ingame[socket.id].opponent].socket;
}

function checkAnswers(gameAnswers, socket) {
  console.log(gameAnswers);
  // player1 => ingame[socket.id] => gameAnswers[1]
  // player2 => ingame[ingame[socket.id].opponent] => gameAnswers[0]

  // check nombre
  if(gameAnswers[1].nombre.charAt(0) == letter) {
    if(gameAnswers[0].nombre.charAt(0) == letter) {
      if(gameAnswers[1].nombre == gameAnswers[0].nombre) {
        ingame[socket.id].score += 50;
        ingame[ingame[socket.id].opponent].score += 50;
      } else {
        ingame[socket.id].score += 100;
        ingame[ingame[socket.id].opponent].score += 100;
      }
    } else {
      ingame[socket.id].score += 100;
    }
  } else if(gameAnswers[0].nombre.charAt(0) == letter) {
    ingame[ingame[socket.id].opponent].score += 100;
  }

  // check color
  if(gameAnswers[1].color.charAt(0) == letter) {
    if(gameAnswers[0].color.charAt(0) == letter) {
      if(gameAnswers[1].color == gameAnswers[0].color) {
        ingame[socket.id].score += 50;
        ingame[ingame[socket.id].opponent].score += 50;
      } else {
        ingame[socket.id].score += 100;
        ingame[ingame[socket.id].opponent].score += 100;
      }
    } else {
      ingame[socket.id].score += 100;
    }

  } else if(gameAnswers[0].color.charAt(0) == letter) {
    ingame[ingame[socket.id].opponent].score += 100;
  }


  // check fruto
  if(gameAnswers[1].fruto.charAt(0) == letter) {
    if(gameAnswers[0].fruto.charAt(0) == letter) {
      if(gameAnswers[1].fruto == gameAnswers[0].fruto) {
        ingame[socket.id].score += 50;
        ingame[ingame[socket.id].opponent].score += 50;
      } else {
        ingame[socket.id].score += 100;
        ingame[ingame[socket.id].opponent].score += 100;
      }
    } else {
      ingame[socket.id].score += 100;
    }

  } else if(gameAnswers[0].fruto.charAt(0) == letter) {
    ingame[ingame[socket.id].opponent].score += 100;
  }

}
