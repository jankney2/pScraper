const massive = require("massive");
require("dotenv").config();
const puppeteer = require("puppeteer");
const { DB_STRING } = process.env;
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");
const {performance}=require('perf_hooks')

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

  await page.goto(process.env.P_SECRET_URL, { waitUntil: "networkidle2" });
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
    "../../../Downloads/NPS+Export+(Based+on+Service+Date).csv"
  );
  const jsonArray = await csv().fromFile(csvFilePath);

  let filtered = jsonArray.filter(el => {
    return (
      moment(el["Response Date"]).format("YYYY-MM-DD") ===
      moment()
        .subtract(1, "day")
        .format("YYYY-MM-DD")
    );
  });
  console.log(filtered.length, "array length");
  for (let i = 0; i < filtered.length; i++) {
    let base = filtered[i];
    //db adder
    console.log("progress", i, "/", filtered.length);
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

const attNps = async db => {
  let employees = await db.query(
    "select first_name, last_name, proutes_id from employees where proutes_type !=2"
  );


  // and is_active=1
  let promises = [];
  let start = performance.now();
  console.log(start / 1000, "start time");
  for (let i = 0; i < employees.length; i++) {
    let likeStr = `${employees[i].first_name.replace(
      employees[i].first_name.charAt(0),
      "%_"
    )}%${employees[i].last_name.replace(
      employees[i].last_name.charAt(0),
      "_"
    )}%`;
    // console.log(likeStr, i);
    promises.push(db.att_podium_nps([employees[i].proutes_id, likeStr]));
  }

  Promise.all(promises).then(() => {
    let finish = performance.now();

    try {
      const delPath = path.resolve(
        __dirname,
        "../../../../../Downloads/NPS+Export+(Based+on+Service+Date).csv"
      );
      fs.unlinkSync(delPath);
    } catch (error) {
      console.log(error, "err with delete");
    }
    console.log(`time taken ${finish - start} millis`);
    console.log("att nps finished, file deleted");
  });
};

const fireAll = async () => {
  let database = await massive({
    connectionString: DB_STRING,
    ssl: true
  });
    await scrapeNps();
  await addNps(database);
  await attNps(database);

  console.log("all finished!");
};
fireAll();
