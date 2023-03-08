import express from "express";
import * as retryAxios from "retry-axios";
import axios from "axios";
import { Client } from "@notionhq/client";
import * as fs from "fs/promises";
import { env } from "./env";

const app = express();

app.use(express.json());

const notion = new Client({
  auth: env.NOTION_SECRET
});

retryAxios.attach();

var plainQuery = "fields id,name,genres,platforms,first_release_date,url;\r\nwhere first_release_date > 1577836800 & first_release_date < 1704067199 & first_release_date != null;\r\nsort first_release_date desc;\r\nlimit 500;"

var totalGames;
var skip = 0;
var games: any = [];
var arr_genres: { "id": number, "name": string }[] = [];
var arr_platforms: { "id": number, "name": string }[] = [];

interface GameData {
  id: number,
  first_release_date: number,
  genres?: number[],
  name: string,
  platforms?: number[]
}

async function getGenres() {
  let genresQuery = "fields id,name;\r\nsort id asc;\r\nlimit 30;"

  try {
    let response = await axios({
      url: "https://api.igdb.com/v4/genres",
      data: genresQuery,
      method: "POST",
      headers: {
        "Client-ID": env.ID_CLIENT,
        Authorization: env.ACCESS_TOKEN,
        "Content-Type": "text/plain",
      },
      timeout: 10000,
    });

    arr_genres = [...arr_genres, ...response.data];
  } catch (error) {
    console.log(error)
  }
}

async function getPlatforms() {
  let platformsQuery = "fields id,name;\r\nsort id asc;\r\nlimit 500;"

  try {
    let response = await axios({
      url: "https://api.igdb.com/v4/platforms",
      data: platformsQuery,
      method: "POST",
      headers: {
        "Client-ID": env.ID_CLIENT,
        Authorization: env.ACCESS_TOKEN,
        "Content-Type": "text/plain",
      },
      timeout: 10000,
    });

    arr_platforms = [...arr_platforms, ...response.data];
  } catch (error) {
    console.log(error)
  }
}

async function response() {
  try {
    do {
      plainQuery += "\r\noffset " + skip + ";"

      let response = await axios({
        url: "https://api.igdb.com/v4/games",
        data: plainQuery,
        method: "POST",
        headers: {
          "Client-ID": env.ID_CLIENT,
          Authorization: env.ACCESS_TOKEN,
          "Content-Type": "text/plain",
        },
        timeout: 10000,
        // raxConfig: {
        //   httpMethodsToRetry: ["POST"],
        //   retry: 10,
        //   noResponseRetries: 5,
        //   retryDelay: 1000,
        //   checkRetryAfter: true,
        //   onRetryAttempt: (error) => {
        //     const cfg = retryAxios.getConfig(error) || {};
        //     console.log("Retry Attempt" + cfg.currentRetryAttempt);
        //   },
        //   shouldRetry: (error) => {
        //     console.error(error);
        //     return true;
        //   },
        // },
      });

      totalGames = response.headers["x-count"];
      games = [...games, ...response.data];

      let file = await fs.readFile("games.json", "utf8");
      let json = JSON.parse(file);

      json = [...json, ...response.data];

      await fs.writeFile("games.json", JSON.stringify(games));
    } while (games.length < parseInt(totalGames) / 1200);

    let file = await fs.readFile("games.json", "utf8");
    let json: GameData[] = JSON.parse(file);

    for (let i = 0; i < json.length; i++) { 
      post(json[i]);
    }
  } catch (error) {
    console.log(error)
  }
}

async function post({ name, genres = [], platforms = [], first_release_date }: GameData) {
  const date = new Date(first_release_date * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
// Create an array of objects representing the genre options
  const genreOptions = genres.map((id) => {
    const genre = arr_genres.find((genre) => genre.id === id);
    return {
      // id: id.toString(),
      name: genre ? genre.name : "",
    };
  });
// Create an array of objects representing the console platforms
  const platformOptions = platforms.map((id) => {
    const platform = arr_platforms.find((platform) => platform.id === id);
    return {
      // id: id.toString(),
      name: platform ? platform.name : "",
    };
  });

  const response = await notion.pages.create({
    parent: {
      database_id: env.DATABASE_ID
    },
    properties: {
      Title: {
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: name,
            },
          },
        ],
      },
      Genres: {
        type: "multi_select",
        multi_select: genreOptions || [],
      },
      Platform: {
        type: "multi_select",
        multi_select: platformOptions || [],
      },
      Release_Date: {
        type: "date",
        date: {
          start: `${year}-${month}-${day}`,
        },
      },
    },
  });

  return response;
}

getGenres()
getPlatforms()
response()

// post("Yurts in Big Sur, California")
// app.get('/', (req, res) => {
//   res.send(JSON.stringify(post(req.body)))
// })

app.listen(env.PORT, () => console.log('server is running!'));





