const fetch = require("./fetch");
const { Headers } = fetch;
const { LokiLogger } = require('../modules/loki-logger/loki-logger.service');
const { HttpService } = require('@nestjs/axios');
const { ConfigService } = require('@nestjs/config');

const logger = new LokiLogger(
  'utils',
  new HttpService(),
  new ConfigService()
);

export function isMostlyEnglish(text: string): boolean {
  const englishCharacterCount = (
    text.match(/[a-zA-Z0-9\s.,!?'"`~@#$%^&*()-_=+[\]{};:\\|<>/?]/g) || []
  ).length;
  const totalCharacters = text.length;
  const englishCharacterPercentage =
    (englishCharacterCount / totalCharacters) * 100;
  return englishCharacterPercentage >= 90;
}

export const wordToNumber = (input, type = "benId") => {
  input = input.toLowerCase();
  // Map of words to numbers
  const wordToNum = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    a: "A",
    b: "B",
    c: "C",
    d: "D",
    e: "E",
    f: "F",
    g: "G",
    h: "H",
    i: "I",
    j: "J",
    k: "K",
    l: "L",
    m: "M",
    n: "N",
    o: "O",
    p: "P",
    q: "Q",
    r: "R",
    s: "S",
    t: "T",
    u: "U",
    v: "V",
    w: "W",
    x: "X",
    y: "Y",
    z: "Z",
  };

  // Remove punctuation, extra spaces, and common noise words
  input = input
    .replace(/[.,:;?!-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /(and|is|the|this|with|for|it|its|ok|sure|yes|please|use|enter|login|received|needed|code|verify|access|confirm|your|needed|remember|need|forget)/gi,
      ""
    );

  // Convert "double", "triple" (and their misspellings) followed by a word or a number
  const repetitionReplacement = (match, count, word) => {
    let repeatCount = 1;
    if (count.toLowerCase().startsWith("dou")) repeatCount = 2;
    if (
      count.toLowerCase().startsWith("tri") ||
      count.toLowerCase().startsWith("ter") ||
      count.toLowerCase() === "thriple"
    ) {
      repeatCount = 3;
    }

    if (wordToNum[word.toLowerCase()] !== undefined) {
      return wordToNum[word.toLowerCase()].toString().repeat(repeatCount);
    }
    if (!isNaN(parseInt(word))) {
      return word.repeat(repeatCount);
    }
    return match; // if it's neither a word nor a number, return the match as is
  };
  input = input.replace(
    /(double|triple|trible|trouble|terrible|terribel|terribal|thriple|single)\s+(\w+)/gi,
    repetitionReplacement
  );

  // Convert words directly followed by digits (like "One234")
  for (let word in wordToNum) {
    const regex = new RegExp(word + "(\\d+)", "gi");
    input = input.replace(regex, (_, digits) => wordToNum[word] + digits);
    input = input.replace(word, wordToNum[word]);
  }

  if (type == "benId") {
    // Convert standalone words to numbers or alphabets
    let sanitizedStr = input
      .split(" ")
      .map((word) => {
        if (wordToNum[word.toLowerCase()] !== undefined) {
          return wordToNum[word.toLowerCase()];
        }
        return word;
      })
      .join("");

    // Ensure the format: <2 alphabets><9 digits>
    const formatRegex = /^([a-zA-Z]{2})(\d{9})$/;
    if (!formatRegex.test(sanitizedStr)) {
      if (/[a-zA-Z]+/.test(sanitizedStr.slice(0, 2))) {
        sanitizedStr =
          sanitizedStr.slice(0, 2) +
          sanitizedStr.slice(2).replace(/[^0-9]/g, "");
        return sanitizedStr;
        // if(sanitizedStr.slice(2).length == 9) {
        //   return sanitizedStr
        // }
      }

      return sanitizedStr.replace(/[^\d]/g, "");
    }
    return sanitizedStr;
  } else {
    // Convert standalone words to numbers
    let numStr = input
      .split(" ")
      .map((word) => {
        if (wordToNum[word.toLowerCase()] !== undefined) {
          return wordToNum[word.toLowerCase()];
        }
        return word;
      })
      .join("");

    // Remove any non-numeric characters
    numStr = numStr.replace(/[^\d]/g, "");

    if (type == "otp") numStr = `${numStr}`.slice(0, 4);

    return numStr;
  }
};

export const encryptRequest = async (text: string) => {
  try {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    logger.log("text: ", text);
    var raw = JSON.stringify({
      EncryptedRequest: text,
    });

    var requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    let response: any = await fetch(
      `${process.env.PM_KISAN_ENC_DEC_API}/EncryptedRequest`,
      requestOptions
    );
    response = await response.json();
    return response;
  } catch (error) {
    return {
      error: "Error while encrypting the message.",
    };
  }
};

export const decryptRequest = async (text: string, token: string) => {
  try {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      DecryptedRequest: `${text}@${token}`,
    });

    var requestOptions: any = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    let response = await fetch(
      `${process.env.PM_KISAN_ENC_DEC_API}/DecryptedRequest`,
      requestOptions
    );
    response = await response.json();
    return response;
  } catch (error) {
    return {
      error: "Error while decrypting the message.",
    };
  }
};

export const formatStringsToTable = (tableData: Array<string>) => {
  let formattedString = `<table class="aadhar-table"><tbody>`;
  tableData.forEach((text) => {
    let td = text.split("-");
    formattedString += `<tr><td>${td[0].trim()} :</td><td>${td
      .slice(1)
      .join("-")
      .trim()}</td></tr>`;
  });
  formattedString += `</tbody></table>`;
  return formattedString;
};

export const titleCase = (str) => {
  var splitStr = str.toLowerCase().split(" ");
  for (var i = 0; i < splitStr.length; i++) {
    // You do not need to check if i is larger than splitStr length, as your for does that for you
    // Assign it back to the array
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  // Directly return the joined string
  return splitStr.join(" ");
};

export const addOrdinalSuffix = (number) => {
  if (number % 100 >= 11 && number % 100 <= 13) {
    return number + "th";
  } else {
    switch (number % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
      default:
        return number + "th";
    }
  }
};

export const removeLinks = (inputString) => {
  // Define a regular expression pattern for identifying links
  var linkPattern =
    /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
  // Use the replace() method to replace all links with an empty string
  var resultString = inputString.replace(linkPattern, "");
  return resultString;
};
