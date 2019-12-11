// List-up the top20 players named to the dropdown menu
d3.json('static/db/players.json').then(dropDownMenuOrganizer);

var shotChart = d3.select('.shot-chart');
var shotType = d3.select('input[name="shots-on-court"]:checked').node().id;

// containers for the predicted and actual stats
const fgPct2019 = d3.select("#fg-pct-2019");
const fgPctPredict = d3.select("#fg-pct-predict");
const ptsPlayer2019 = d3.select("#pts-player-2019");
const ptsPlayerPredict = d3.select("#pts-player-predict");
const ptsTeam2019 = d3.select("#pts-team-2019");
const ptsTeamPredict = d3.select("#pts-team-predict");
const gameResult = d3.select("#game-result")


const radioShotsOnCourt = d3.selectAll("input[name='shots-on-court']");
// const radioShotsOnCourt = d3.select('input[name="shots-on-court"]:checked');
radioShotsOnCourt.on("change", function() {
    shotType = this.id; // user-shots or random-shots
    console.log(shotType);
    // Clean-up existing data: 
    // prediction summary table, random-shot-chart, and user-shot-chart, if they exist
    fgPct2019.text("");
    fgPctPredict.text("");
    ptsPlayer2019.text("");
    ptsPlayerPredict.text("");
    ptsTeam2019.text("");
    ptsTeamPredict.text("");
    gameResult.text("");

    groups.shotGroup.selectAll('circle').remove();
    groups.userClickableArea.selectAll('circle').remove();

    // especially for the case that it needs to be done with random shots once the radio button clicked
    // while showing the same player.
    if (shotType === 'random-shots') {
        get_random_shots();
    }
});


svgWidth = 500;
svgHeight = 470;

var margin = {
    top: 40.19,
    right: 30.059,
    bottom: 30,
    left: 30.059
};

const svg = shotChart.append('svg')
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('xmlns', 'http://www.w3.org/2000/svg')
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);


// Get the dimensions for shot zone
const courtWidth = 470.364 + margin.right;
var halfCourtHeight = 470;

const groups = {
    court: svg.append('g').attr('class', 'court'),
    hoop: svg.append('g').attr('class', 'hoop'),
    userClickableArea: svg.append('g')
        .attr('class', 'userClickableArea'),
    shotGroup: svg.append('g')
        .attr('class', 'shots')
        .attr('width', courtWidth) // courtWidth is a global variable
        .attr('height', halfCourtHeight) // halfCourtHeight is also in global scope
};

// scaling for shot x
var xScaler = d3.scaleLinear()
    .domain([-246, 245])
    .range([0, courtWidth]);

// scaling for shot y
var yScaler = d3.scaleLinear()
    .domain([-8, 430])
    .range([margin.top, halfCourtHeight]);


// Draw a court
drawCourt();

// Listen for user-inputted shotchart 
userInputListener(groups.userClickableArea);

// display a player's stat with Al Horford at first
player_stats_table(201143);

// Draw shots when selecting a player on the dropdown menu

var playerDropDown = $('.selectpicker')
playerDropDown.change(function() {
    // Clean-up existing data: 
    // prediction summary table, random-shot-chart, and user-shot-chart, if they exist
    fgPct2019.text("");
    fgPctPredict.text("");
    ptsPlayer2019.text("");
    ptsPlayerPredict.text("");
    ptsTeam2019.text("");
    ptsTeamPredict.text("");
    gameResult.text("");

    groups.shotGroup.selectAll('circle').remove();
    groups.userClickableArea.selectAll('circle').remove();

    // const NumberOfRandomShots = parseInt(d3.select('#shot-counts').node().value);

    let playerId = playerDropDown.val();
    const where = "LIKE"; //* "LIKE": to get 2019-20 dataset, "NOT LIKE": to get ≤ 2018-19 dataset

    // update player's stats on the browser
    player_stats_table(playerId);

    // If the radio button for randomized shots is checked,
    // then the shots randomly chosen from 2019-20 actual shot-chart dataset
    // will be displayed with the amount defined by user (default: 100 ea).
    // For drawing player's actual shot charts
    if (shotType === 'random-shots') {
        get_random_shots();

    } else {
        // Make the array for storing the user-inputs empty whenever trying another player
        userInputListener(groups.userClickableArea);
    }

    getPlayerImage(playerId);
});


function get_random_shots() {

    let playerId = playerDropDown.val();
    const where = "LIKE"; //* "LIKE": to get 2019-20 dataset, "NOT LIKE": to get ≤ 2018-19 dataset

    const NumberOfRandomShots = parseInt(d3.select('#shot-counts').node().value);

    d3.json(`/shotchart?playerId=${playerId}&where=${where}`).then((response) => {
        // console.log(response);
        const randonmizedShots = knuthShuffle(response, NumberOfRandomShots);
        drawShots(randonmizedShots, courtWidth, halfCourtHeight, xScaler, yScaler);

        // When user click the button "Calculate Results"
        d3.select('#finishedShotButton').on('click', function() {
            console.log(randonmizedShots);
            submitUserInputtedShotcharts(randonmizedShots);
        });
    });
}


function player_stats_table(personid) {
    // target the html area

    var playerStatAccess = d3.select('#playerStatTable');

    // clean-up the existing stats
    playerStatAccess.html('')

    // read the csv
    d3.csv("static/db/2018_Player_stats.csv").then(function(response) {
        // peer into the data via console
        console.log('data from csv player stats:', response);

        // create variables
        let player_record;

        // for loop
        for (let i = 0; i < response.length; i++) {
            let record = response[i]; // each dictionary
            // find the player where the person ID matches
            if (parseInt(record["PERSON_ID"]) == personid) {
                player_record = record;
            }
        }

        // build the html text table (using d3)
        for (const [key, value] of Object.entries(player_record)) {
            // we have each key, value in the player record
            console.log(key, value);
            const removed = ["INDEX", "DISPLAY_FIRST_LAST", "PERSON_ID", "FGM", "FGA", "FG3M", "FG3A", "FTM", "FTA", "OREB", "DREB"]
                // create a data "row" for each set
                // <li class="list-group-item"><span>Name: </span>sample data info</li>
                // if (!(key == "" || key == "DISPLAY_FIRST_LAST" || key == "PERSON_ID")) {
            if (!removed.includes(key)) {
                if (key === "TEAM_ABBREVIATION") {
                    d3.select('body').style('background-image', `url("https://stats.nba.com/media/img/teams/logos/${value}_logo.svg")`)
                }

                playerStatAccess.append('li')
                    .attr('class', 'list-group-item ml-4 mb-n3')
                    .html(`<span>${key}: </span>${value}`);

            }

        }

    })
}
// diplay completed game win/loss results to site
// var playerWinLossResults = $('.winLossColumn')

function submitUserInputtedShotcharts(shotArray) {

    let playerName = $("#player-selector option:selected").text();

    fetch(`${window.origin}/user-input`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({
                'playerName': playerName,
                'data': shotArray
            }),
            cache: "no-cache",
            headers: new Headers({
                "content-type": "application/json"
            })
        })
        .then(function(response) {
            if (response.status !== 200) {
                console.log(`Looks like there was a problem. Status code: ${response.status}`);
                return;
            }
            response.json().then(function(data) {
                console.log(data);
                const predict = d3.select("#predictions");

                // display season average and predicted results to the table
                fgPct2019.text(`${Math.round(data[0].FG_PCT_2019 * 100) / 100} / ${Math.round(data[0].FG3_PCT_2019 * 100) / 100}`);
                fgPctPredict.text(`${Math.round(data[0].FG_PCT * 100) / 100} / ${Math.round(data[0].FG3_PCT * 100) / 100}`);
                ptsPlayer2019.text(`${Math.round(data[0].PTS_player_AVG_2019 * 10) / 10}`);
                ptsPlayerPredict.text(`${Math.round(data[0].PTS_player * 10) / 10}`);
                ptsTeam2019.text(`${Math.round(data[0].PTS_team_AVG_2019 * 10) / 10}`);
                ptsTeamPredict.text(`${Math.round(data[0].PTS_team * 10) / 10}`);
                gameResult.text(`${data[0].WIN_LOSE}`);
            });
        })
        .catch(function(error) {
            console.log("Fetch error: " + error);
        });
}

// Listen to user-inputs and display them on the court.
// Fianlly, throw them to back-end when fetching
function userInputListener(userClickableArea) {

    var userShots = [];
    // var playerId = playerDropDown.val();

    userClickableArea.append('rect')
        .attr('x', '0')
        .attr('width', `${(470.364 + 30.059)}`)
        .attr('height', '470')
        .on("click", mouseClick);

    function mouseClick(d) {
        const [x, y] = d3.mouse(this);
        const [shotX, shotY] = [
            Math.floor(xScaler.invert(x)),
            Math.floor(yScaler.invert(y))
        ]

        userShots.push({ LOC_X: shotX, LOC_Y: shotY, SHOT_ATTEMPTED_FLAG: 1 })

        console.log(`X=${x}, Y=${y}`);
        console.log(`Shot X=${shotX}, Shot Y=${shotY}`);

        userClickableArea.append('circle')
            .attr('class', 'userShot')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', '5');
    }

    // When user click the button "Calculate Results"
    d3.select('#finishedShotButton').on('click', function() {
        console.log(userShots);
        submitUserInputtedShotcharts(userShots);
    });
}

function getPlayerImage(playerId) {

    // be able to add a team logo inside player's pic
    // using team's abbreviation. we can pull a team logo for every player
    // https://stats.nba.com/media/img/teams/logos/{BOS}_logo.svg

    const image = d3.select("#player-image")
    image.attr('src', `http://stats.nba.com/media/players/230x185/${playerId}.png`)
        .attr('alt', playerId);
}

function drawShots(shots) {
    // draw shots

    // create a svg group for shot zone based on the dimensions above
    const shotGroup = groups.shotGroup;
    shotGroup.selectAll('circle').remove();

    shotGroup.selectAll('circle')
        .data(shots)
        .enter()
        .append('circle')
        .attr('cx', d => xScaler(d.LOC_X))
        .attr('cy', d => yScaler(d.LOC_Y))
        .attr('r', '5');
}


function drawCourt() {
    const courtGroup = groups.court;
    const hoopGroup = groups.hoop;

    // Draw a polyline for the court
    courtGroup.append('polyline')
        .attr('points', '470.364,137.064 470.364,0 30.059,0 30.059,137.064');

    // rects
    courtGroup.append('rect')
        .attr('x', '170.196')
        .attr('width', '160.033')
        .attr('height', '189.945');

    courtGroup.append('rect')
        .attr('x', '0')
        .attr('width', `${(470.364 + 30.059)}`)
        .attr('height', '470');

    // paths
    courtGroup.append('path')
        .attr('d', 'M190.518,189.945 c0,32.943,26.726,59.65,59.694,59.65c32.97,0,59.695-26.707,59.695-59.65');

    courtGroup.append('path')
        .attr('d', 'M210.729,52.773 c2.745,21.792,22.653,37.229,44.459,34.486c18.033-2.269,32.236-16.464,34.509-34.486');

    courtGroup.append('path')
        // .attr('stroke-dasharray', '13.33,11.67')
        .attr('d', 'M309.907,189.945c0-32.943-26.726-59.649-59.695-59.649c-32.969,0-59.694,26.706-59.694,59.649');

    courtGroup.append('path')
        .attr('d', 'M30.203,137.058 c49.417,121.198,187.98,179.485,309.489,130.194c59.332-24.068,106.401-71.017,130.529-130.194');

    courtGroup.append('path')
        .attr('d', 'M309.907,470 c0-32.945-26.726-59.65-59.695-59.65c-32.969,0-59.694,26.705-59.694,59.65');

    // lines
    courtGroup.append('line')
        .attr('x1', `${170.196 - ((190.094 - 170.196) * 1.5)}`)
        .attr('y1', '0')
        .attr('x2', `${170.196 - ((190.094 - 170.196) * 1.5)}`)
        .attr('y2', '10');

    courtGroup.append('line')
        .attr('x1', `${(170.196 + 160.033) + (((170.196 + 160.033) - 310.331) * 1.5)}`)
        .attr('y1', '0')
        .attr('x2', `${(170.196 + 160.033) + (((170.196 + 160.033) - 310.331) * 1.5)}`)
        .attr('y2', '10');

    courtGroup.append('line')
        .attr('x1', '30.059')
        .attr('y1', '137.064')
        .attr('x2', '0')
        .attr('y2', '137.064');

    courtGroup.append('line')
        .attr('x1', '470.364')
        .attr('y1', '137.064')
        .attr('x2', `${470.364 + 30.059}`)
        .attr('y2', '137.064');

    courtGroup.append('line')
        .attr('x1', '30.059')
        .attr('y1', `${137.064 * 2}`)
        .attr('x2', '0')
        .attr('y2', `${137.064 * 2}`);

    courtGroup.append('line')
        .attr('x1', '470.364')
        .attr('y1', `${137.064 * 2}`)
        .attr('x2', `${470.364 + 30.059}`)
        .attr('y2', `${137.064 * 2}`);

    courtGroup.append('line')
        .attr('x1', '310.331')
        .attr('y1', '189.945')
        .attr('x2', '310.331')
        .attr('y2', '0');

    courtGroup.append('line')
        .attr('x1', '190.094')
        .attr('y1', '189.945')
        .attr('x2', '190.094')
        .attr('y2', '0');

    courtGroup.append('line')
        .attr('x1', '330.229')
        .attr('y1', '0')
        .attr('x2', '340.391')
        .attr('y2', '0');

    courtGroup.append('line')
        .attr('x1', '340.391')
        .attr('y1', '145.95')
        .attr('x2', '330.229')
        .attr('y2', '145.95');

    courtGroup.append('line')
        .attr('x1', '340.391')
        .attr('y1', '114.223')
        .attr('x2', '330.229')
        .attr('y2', '114.223');

    courtGroup.append('line')
        .attr('x1', '340.391')
        .attr('y1', '82.495')
        .attr('x2', '330.229')
        .attr('y2', '82.495');

    courtGroup.append('line')
        .attr('x1', '340.391')
        .attr('y1', '71.071')
        .attr('x2', '330.229')
        .attr('y2', '71.071');

    courtGroup.append('line')
        .attr('x1', '160.032')
        .attr('y1', '145.95')
        .attr('x2', '170.196')
        .attr('y2', '145.95');

    courtGroup.append('line')
        .attr('x1', '160.032')
        .attr('y1', '114.223')
        .attr('x2', '170.196')
        .attr('y2', '114.223');

    courtGroup.append('line')
        .attr('x1', '160.032')
        .attr('y1', '82.495')
        .attr('x2', '170.196')
        .attr('y2', '82.495');

    courtGroup.append('line')
        .attr('x1', '160.032')
        .attr('y1', '71.071')
        .attr('x2', '170.196')
        .attr('y2', '71.071');

    // Draw a hoop in the court
    hoopGroup.append('line')
        .attr('class', 'backboard')
        .style('stroke-width', '5.0')
        .attr('x1', '280.271')
        .attr('y1', '40.19')
        .attr('x2', '220.151')
        .attr('y2', '40.19');

    hoopGroup.append('path')
        .attr('class', 'rim')
        .attr('d', 'M250.212,54.993 c3.977,0,7.197-3.215,7.197-7.188c0-3.977-3.221-7.192-7.197-7.192c-3.976,0-7.197,3.216-7.197,7.192 C243.015,51.778,246.236,54.993,250.212,54.993z');
}


function knuthShuffle(arr, elements) {
    var rand, temp, i;

    for (i = arr.length - 1; i > 0; i -= 1) {
        rand = Math.floor((i + 1) * Math.random()); //get random between zero and i (inclusive)
        temp = arr[rand]; //swap i and the zero-indexed number
        arr[rand] = arr[i];
        arr[i] = temp;
    }
    return arr.slice(0, elements);
}


function dropDownMenuOrganizer(jsonData) {
    // Assign items to dropdown selections
    // Sort them and prevent duplicates
    const options = [];

    jsonData.sort((a, b) => {
        if (a.PLAYER_NAME > b.PLAYER_NAME) {
            return 1
        } else {
            return -1
        }
    }).forEach((player, index) => {
        const option = `<option value=${player.PLAYER_ID}> ${player.PLAYER_NAME} </option>`;
        options.push(option)
    });

    d3.select(".selectpicker").html(options)
    $('.selectpicker').selectpicker('refresh');
}