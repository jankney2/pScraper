const massive = require("massive");
require("dotenv").config();
const puppeteer = require("puppeteer");
const { DB_STRING } = process.env;
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");

const scrapeNps = async () => {
  //scrapes the nps from podium

  console.log("hit podium scraper");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  const page = await browser.newPage();
  await page.goto("https://auth.podium.com", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    document.getElementById("emailOrPhoneInput").click();
  });
  await page.keyboard.type(process.env.P_EMAIL);
  await page.evaluate(() => {
    document.getElementById("signInButton").click();
  });
  await page.waitFor(2000);
  await page.evaluate(() => {
    document.getElementById("passwordInput");
  });
  await page.keyboard.type(process.env.P_PASS);
  await page.evaluate(() => {
    document.getElementById("signInButton").click();
  });

  await page.waitForSelector("#selenium-insights");

  await page.goto(P_SECRET_URL, { waitUntil: "networkidle2" });
  await page.waitFor(10000);

  await page.goto(process.env.P_D_URL, { waitUntil: "networkidle2" });

  await page.waitForSelector("i.icon-wrench");
  await page.evaluate(async () => {
    await document.querySelector("i.icon-wrench").click();

    await document.querySelectorAll("div.db-text-body.label")[1].click();
    await document.getElementById("export-csv").click();
  });
  await page.waitFor(3000);
  await browser.close();
  console.log("browser shut down");
};

const addNps = async db => {
  //change me
  const csvFilePath = path.resolve(
    __dirname,
    "../../../../../Downloads/NPS+Export+(Based+on+Service+Date).csv"
  );
  const jsonArray = await csv().fromFile(csvFilePath);
  console.log(jsonArray[0], "zero index");
  for (let i = 0; i < jsonArray.length; i++) {
    let base = jsonArray[i];
    //db adder
    console.log("progress", i, "/", jsonArray.length);
    //add in logic to check the add date. only add from yesterday?

    try {
      await db.add_nps([
        base["Invite Date"],
        base["Response Date"],
        base["Phone"],
        base["Location"],
        base["Technician"],
        base["Customer Name"],
        +base["Rating"],
        base["Comment"]
      ]);
    } catch (error) {
      console.log(error, "error with podium adder");
    }

    //delete downloaded file
  }

  console.log("finished adding podium data");
};

const fireAll = async () => {
  let database = await massive({
    connectionString: DB_STRING,
    ssl: true
  });
};
