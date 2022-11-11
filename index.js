import fetch from 'node-fetch';
import allTeams from './teams.js';

let nbOfPlayers = 5;
let teams = allTeams;

process.argv.forEach(function (value, index) {
  if (index === 2 && value) nbOfPlayers = value;
  if (index === 3 && value) teams = [allTeams.find(team => team.name === value)];
});

const getTeamStat = async team => {
  const teamMatches = await Promise.all(
    team.playerIds.map(id =>
      fetch(`https://open.faceit.com/data/v4/players/${id}/history?game=csgo&offset=0&limit=100`, {
        method: 'get',
        headers: { Authorization: 'Bearer 6ce9a64f-8859-4b08-bfdf-063b52a83782' },
      }).then(res => res.json())
    )
  );

  let allMatches = [];

  teamMatches.forEach(match => (allMatches = allMatches.concat(match.items)));
  const uniqueAllMatches = allMatches.filter(
    (match, index, self) => self.findIndex(m => m.match_id === match.match_id) === index
  );

  const praccMatches = uniqueAllMatches.filter(match => {
    const matchedPlayers = match.playing_players.filter(player => {
      return team.playerIds.includes(player);
    });

    return matchedPlayers.length >= nbOfPlayers;
  });

  const results = {
    de_nuke: {
      win: 0,
      lose: 0,
    },
    de_inferno: {
      win: 0,
      lose: 0,
    },
    de_dust2: {
      win: 0,
      lose: 0,
    },
    de_mirage: {
      win: 0,
      lose: 0,
    },
    de_ancient: {
      win: 0,
      lose: 0,
    },
    de_vertigo: {
      win: 0,
      lose: 0,
    },
    de_overpass: {
      win: 0,
      lose: 0,
    },
  };
  Promise.all(
    praccMatches.map(async match => {
      const matchRawData = await fetch(`https://open.faceit.com/data/v4/matches/${match.match_id}/stats`, {
        method: 'get',
        headers: { Authorization: 'Bearer 6ce9a64f-8859-4b08-bfdf-063b52a83782' },
      });
      const matchData = (await matchRawData.json()).rounds;
      if (!matchData) return;

      const map = matchData[0].round_stats.Map;

      const isFaction1 = match.teams.faction1.players.map(({ player_id }) => player_id).includes(team.playerIds[0]);
      const isFaction1Won = match.results.score.faction1;
      const teamHasWon = (isFaction1 && isFaction1Won) || (!isFaction1 && !isFaction1Won);
      teamHasWon ? results[map].win++ : results[map].lose++;
    })
  ).then(() => {
    const mapNames = Object.keys(results);
    mapNames.forEach(map => {
      const currentMap = results[map];
      results[map] = {
        ...currentMap,
        winRate:
          currentMap.win === 0
            ? 0 + '%'
            : ((currentMap.win / (currentMap.win + currentMap.lose)) * 100).toFixed(0) + '%',
      };
    });
    console.log(team.name, results);
  });

  // console.log('praccMatches', praccMatches);
};

Promise.all(teams.map(getTeamStat));
