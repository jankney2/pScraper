const massive = require("massive");
require("dotenv").config();
const puppeteer = require("puppeteer");
const { DB_STRING } = process.env;
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");
const { performance } = require("perf_hooks");

const scrapeNps = async () => {
  //scrapes the nps from podium

  console.log("hit podium scraper");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  const page = await browser.newPage();

  try {
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
    await page.waitFor(3000);
    await page.evaluate(async () => {
      await document.querySelector("i.icon-wrench").click();

      await document.querySelectorAll("div.db-text-body.label")[1].click();
      await document.getElementById("export-csv").click();
    });
    await page.waitFor(3000);
    await browser.close();
    console.log("browser shut down");
  } catch (error) {
    console.log(error);
  }
};

const addNps = async (db, seed) => {
  //change me

  await db.query("delete from podium_nps");


  const csvFilePath = path.resolve(__dirname, `NPS.csv`);

  console.log(csvFilePath, "faweoifj");
  const jsonArray = await csv().fromFile(csvFilePath);
  console.log(jsonArray.length);
  
  let filtered;
  let promises = [];
  if (!seed && jsonArray[0]["Response Date"]) {
    filtered = jsonArray.filter(el => {
      return (
        moment(el["Response Date"]).format("YYYY-MM-DD") >=
        moment()
          .startOf("month")
          .format("YYYY-MM-DD")
      );
    });
  } else if (!seed && jsonArray[0]["Response Received At"]) {
    filtered = jsonArray.filter(el => {
      return (
        moment(el["Response Received At"]).format("YYYY-MM-DD") >=
        moment()
          .startOf("month")
          .format("YYYY-MM-DD")
      );
    });
  } else {
    filtered = jsonArray;
  }
  console.log(filtered.length, "array length");
  for (let i = 0; i < filtered.length; i++) {
    console.log(i, filtered.length, "prog");
    let base = filtered[i];
    //db adder
    console.log("progress", i, "/", filtered.length);
    //add in logic to check the add date. only add from yesterday?

    if (base["Invite Date"]) {
      console.log('yEET')
      let identifier = await JSON.stringify({
        invite: base["Invite Date"],
        res: base["Response Date"],
        phone: base["Phone"],
        loc: base["Location"],
        tech: base["Technician"],
        customer: base["Customer Name"],
        rating: +base["Rating"],
        comment: base["Comment"]
      });

      try {
        db.add_nps([
          base["Invite Date"],
          base["Response Date"],
          base["Phone"],
          base["Location"],
          base["Technician"],
          base["Customer Name"],
          +base["Rating"],
          base["Comment"],
          identifier
        ]);
      } catch (error) {
        console.log(error, "error with podium adder");
      }
    }

    if (base["Response Received At"]) {

      let identifier = await JSON.stringify({
        invite: base["Invite Date"],
        res: base["Response Date"],
        phone: base["Phone"],
        loc: base["Location"],
        tech: base["Attributions"],
        customer: base["Customer Name"],
        rating: +base["Rating"],
        comment: base["Comment"]
      });
      try {
        db.add_nps([
          moment(base["Survey Sent At"]).format("YYYY-MM-DD"),
          moment(base["Response Received At"]).format("YYYY-MM-DD"),
          base["Phone Number"],
          base["Location Name"],
          base["Attributions"],
          base["Customer Name"],
          +base["Score"],
          base["Message"],
          identifier
        ]);
      } catch (error) {
        console.log(error, "error with backup adder");
      }
    }

    //delete downloaded file
  }
  Promise.all(promises).then(() => {
    console.log("finished adding podium data");
  });
};

const attNps = async db => {
  const delPath = path.resolve(
    __dirname,
    `/../../../Downloads/NPS+Export+(Based+on+Service+Date).csv`
  );

  let employees = await db.query(
    "select distinct employee_id, e_f_name, e_last_name  from paylocity_hours ph"
  );

  console.log(employees.length, "emp length");
  // and is_active=1
  let promises = [];
  //fix this to run off of paylocity id instead of pestroutes ID.

  for (let i = 0; i < employees.length; i++) {
    let likeStr = `${employees[i].e_f_name.replace(
      employees[i].e_f_name.charAt(0),
      "%_"
    )}%${employees[i].e_last_name.replace(
      employees[i].e_last_name.charAt(0),
      "_"
    )}%`;

    likeStr = likeStr.replace(/ /gi, "%");
    // if(+employees[i].employee_id==102254){

    console.log(likeStr, i, employees.length);
    // }

    // promises.push(db.att_podium_nps([employees[i].proutes_id, likeStr]));

    db.att_podium_nps([employees[i].employee_id, likeStr]);
  }

  // fs.unlinkSync(delPath);
  console.log("file deleted");

  // Promise.all(promises).then(() => {
  //   let finish = performance.now();

  //   try {
  //   } catch (error) {
  //     console.log(error, "err with delete");
  //   }
  //   console.log(`time taken ${finish - start} millis`);
  //   console.log("att nps finished, file deleted");
  // });
};

const fireAll = async () => {
  let database = await massive({
    user: process.env.G_DB_USER,
    password: process.env.G_DB_PASS,
    database: process.env.G_DB_NAME,
    host: process.env.G_DB_HOST
    //DO
    // connectionString: DB_STRING,
    // ssl: true
  });
  // await scrapeNps();

  await addNps(database, true);
  await attNps(database);
};
fireAll();
