import fs from "fs";
import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Problem.js";

dotenv.config();

const BASE_URL = "https://leetcode.com/graphql";

const fetchTags = async (slug) => {
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        topicTags {
          name
        }
      }
    }
  `;
  try {
    const res = await axios.post(BASE_URL, {
      query,
      variables: { titleSlug: slug },
    });
    return res.data.data.question?.topicTags?.map(tag => tag.name) || [];
  } catch (err) {
    console.error(`❌ Error fetching tags for ${slug}`);
    return [];
  }
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const data = fs.readFileSync("ratings.txt", "utf-8").split("\n").slice(1); // skip header

  for (let line of data) {
    if (!line.trim()) continue;

    const cols = line.split("\t"); // tab-separated
    if (cols.length < 5) continue;

    const rating = parseFloat(cols[0]);
    const id = parseInt(cols[1]);
    const title = cols[2].trim();
    const slug = cols[4].trim();

    const topics = await fetchTags(slug);

    const question = new Question({ id, title, slug, rating, topics });
    await question.save();
    console.log(`✅ Saved: ${id} - ${title}`);
  }

  mongoose.disconnect();
};

seed();
