function showToast(msg) {
    console.log('El mensaje es: ', msg);
    $.toast({
        text: msg,
        position: 'top-right'
    });
}

window.socket = null;
function connectToSocketIo() {
    let server = window.location.protocol + '//' + window.location.host;
    window.socket = io.connect(server);

    window.socket.on('toast', function(data) {
        showToast(data.message);
    });

    window.socket.on('displayName', function(data) {
        document.getElementById('playerName').innerHTML = data.player;
    });

    window.socket.on('sendPlayerRoom', function(data) {
        if(data.room.length > 0) {
            console.log(data.room[0]);
            
            $('#ingame').empty();
            for (let player of data.room[0]) {
                console.log(player);
                $('#ingame').append(`
                    <p>${player}</p>
                `);
              }

        }
    });

    window.socket.on('sendWaitingRoom', function(data) {
        console.log(data.room);
        
        $('#lobby').empty();
        for (let player of data.room) {
            console.log(player);
            $('#lobby').append(`
                <p>${player}</p>
            `);
          }
    });

    window.socket.on('beginGame', function(data) {
        console.log(`Selected letter: ${data.letter}`);
        document.getElementById('letter').innerHTML = data.letter;
        document.getElementById('nombre').disabled = false;
        document.getElementById('color').disabled = false;
        document.getElementById('fruto').disabled = false;
        document.getElementById('btn').disabled = false;
    });

    window.socket.on('receiveQuit', function() {
        $('#ingame').empty();
        document.getElementById('letter').innerHTML = '';
        document.getElementById('nombre').value = '';
        document.getElementById('color').value = '';
        document.getElementById('fruto').value = '';
        document.getElementById('winnerName').value = '';
        document.getElementById('playerScore1').value = '';
        document.getElementById('playerScore2').value = '';
        document.getElementById('winner').hidden = true;
        document.getElementById('score').hidden = true;
        document.getElementById('quit').hidden = true;
    });

    window.socket.on('receiveBasta', function() {
        document.getElementById('btn').disabled = true;
    });

    window.socket.on('sendAnswers', function() {
        document.getElementById('nombre').disabled = true;
        document.getElementById('color').disabled = true;
        document.getElementById('fruto').disabled = true;
        
        let nombre = document.getElementById('nombre').value.toUpperCase();
        let color = document.getElementById('color').value.toUpperCase();
        let fruto = document.getElementById('fruto').value.toUpperCase();

        let answer = {
            nombre: nombre,
            color: color,
            fruto: fruto
        }
        
        window.socket.emit('sendToServer', {answer});
    });

    window.socket.on('showResults', function(data) {
        document.getElementById('winnerName').innerHTML = data.result.winner;
        document.getElementById('playerScore1').innerHTML = `${data.result.playerName1}: ${data.result.playerScore1}`;
        document.getElementById('playerScore2').innerHTML = `${data.result.playerName2}: ${data.result.playerScore2}`;
        document.getElementById('letter').hidden = true;
        document.getElementById('winner').hidden = false;
        document.getElementById('score').hidden = false;
        document.getElementById('quit').hidden = false;
    });

    window.socket.on('opponentLeft', function() {
        showToast('Tu oponente se fue');

        document.getElementById('winnerName').innerHTML = 'Ganaste por default';
        document.getElementById('nombre').disabled = true;
        document.getElementById('color').disabled = true;
        document.getElementById('fruto').disabled = true;
        document.getElementById('btn').disabled = true;
        document.getElementById('letter').hidden = true;
        document.getElementById('winner').hidden = false;
        document.getElementById('quit').hidden = false;
    });

}

function basta() {
    window.socket.emit('getBasta');
}

function quitGame() {
    window.socket.emit('quitGame');
}

$(function() {
    // script executed when all other scripts finished
    connectToSocketIo();
});