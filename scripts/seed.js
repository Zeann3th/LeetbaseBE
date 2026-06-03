import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import Auth from "../src/models/Auth.js";
import User from "../src/models/User.js";
import Problem from "../src/models/Problem.js";
import Discussion from "../src/models/Discussion.js";
import Comment from "../src/models/Comment.js";
import Submission from "../src/models/Submission.js";
import DailyProblem from "../src/models/DailyProblem.js";
import Vote from "../src/models/Vote.js";
import Todo from "../src/models/Todo.js";

const bucket = process.env.CF_BUCKET || "leetbase";
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB_NAME || "leetbase";

let seed = 1337;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const int = (min, max) => Math.floor(random() * (max - min + 1)) + min;

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID || "abcdabcd",
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY || "abcdabcd",
  },
});

const problemSpecs = [
  ["Two Sum", "twoSum", ["nums", "target"], [[[[2, 7, 11, 15], 9], [0, 1]], [[[3, 2, 4], 6], [1, 2]]], "EASY", ["array", "hash-table"]],
  ["Valid Parentheses", "isValid", ["s"], [[["()[]{}"], true], [["(]"], false], [["{[]}"], true]], "EASY", ["stack", "string"]],
  ["Merge Two Sorted Arrays", "mergeSorted", ["a", "b"], [[[[1, 3, 5], [2, 4]], [1, 2, 3, 4, 5]], [[[0], []], [0]]], "EASY", ["array", "two-pointers"]],
  ["Maximum Subarray", "maxSubArray", ["nums"], [[[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6], [[[1]], 1]], "MEDIUM", ["array", "dynamic-programming"]],
  ["Climbing Stairs", "climbStairs", ["n"], [[[2], 2], [[3], 3], [[5], 8]], "EASY", ["dynamic-programming"]],
  ["Binary Search", "search", ["nums", "target"], [[[[-1, 0, 3, 5, 9, 12], 9], 4], [[[-1, 0, 3, 5, 9, 12], 2], -1]], "EASY", ["array", "binary-search"]],
  ["Rotate Array", "rotate", ["nums", "k"], [[[[1, 2, 3, 4, 5, 6, 7], 3], [5, 6, 7, 1, 2, 3, 4]], [[[-1, -100, 3, 99], 2], [3, 99, -1, -100]]], "MEDIUM", ["array"]],
  ["Palindrome Number", "isPalindrome", ["x"], [[[121], true], [[-121], false], [[10], false]], "EASY", ["math"]],
  ["Reverse String", "reverseString", ["s"], [[["hello"], "olleh"], [["LeetBase"], "esaBteeL"]], "EASY", ["string", "two-pointers"]],
  ["First Unique Character", "firstUniqChar", ["s"], [[["leetcode"], 0], [["loveleetcode"], 2], [["aabb"], -1]], "EASY", ["hash-table", "string"]],
  ["Contains Duplicate", "containsDuplicate", ["nums"], [[[[1, 2, 3, 1]], true], [[[1, 2, 3, 4]], false]], "EASY", ["array", "hash-table"]],
  ["Move Zeroes", "moveZeroes", ["nums"], [[[[0, 1, 0, 3, 12]], [1, 3, 12, 0, 0]], [[[0]], [0]]], "EASY", ["array", "two-pointers"]],
  ["Best Time to Buy and Sell Stock", "maxProfit", ["prices"], [[[[7, 1, 5, 3, 6, 4]], 5], [[[7, 6, 4, 3, 1]], 0]], "EASY", ["array", "greedy"]],
  ["Single Number", "singleNumber", ["nums"], [[[[2, 2, 1]], 1], [[[4, 1, 2, 1, 2]], 4]], "EASY", ["bit-manipulation"]],
  ["Majority Element", "majorityElement", ["nums"], [[[[3, 2, 3]], 3], [[[2, 2, 1, 1, 1, 2, 2]], 2]], "EASY", ["array", "voting"]],
  ["Fizz Buzz", "fizzBuzz", ["n"], [[[5], ["1", "2", "Fizz", "4", "Buzz"]], [[3], ["1", "2", "Fizz"]]], "EASY", ["simulation"]],
  ["Missing Number", "missingNumber", ["nums"], [[[[3, 0, 1]], 2], [[[0, 1]], 2]], "EASY", ["array", "math"]],
  ["Plus One", "plusOne", ["digits"], [[[[1, 2, 3]], [1, 2, 4]], [[[9]], [1, 0]]], "EASY", ["array", "math"]],
  ["Group Anagrams", "groupAnagrams", ["strs"], [[[["eat", "tea", "tan", "ate", "nat", "bat"]], [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]]], "MEDIUM", ["hash-table", "string"]],
  ["Product of Array Except Self", "productExceptSelf", ["nums"], [[[[1, 2, 3, 4]], [24, 12, 8, 6]], [[[-1, 1, 0, -3, 3]], [0, 0, 9, 0, 0]]], "MEDIUM", ["array", "prefix-sum"]],
  ["Top K Frequent Elements", "topKFrequent", ["nums", "k"], [[[[1, 1, 1, 2, 2, 3], 2], [1, 2]], [[[-1, -1], 1], [-1]]], "MEDIUM", ["hash-table", "heap"]],
  ["Longest Consecutive Sequence", "longestConsecutive", ["nums"], [[[[100, 4, 200, 1, 3, 2]], 4], [[[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], 9]], "MEDIUM", ["array", "hash-table"]],
  ["Valid Anagram", "isAnagram", ["s", "t"], [[["anagram", "nagaram"], true], [["rat", "car"], false]], "EASY", ["hash-table", "string"]],
  ["Longest Palindrome", "longestPalindrome", ["s"], [[["abccccdd"], 7], [["a"], 1]], "EASY", ["hash-table", "string"]],
  ["Integer Square Root", "mySqrt", ["x"], [[[4], 2], [[8], 2]], "EASY", ["math", "binary-search"]],
  ["Search Insert Position", "searchInsert", ["nums", "target"], [[[[1, 3, 5, 6], 5], 2], [[[1, 3, 5, 6], 2], 1]], "EASY", ["array", "binary-search"]],
  ["Coin Change", "coinChange", ["coins", "amount"], [[[[1, 2, 5], 11], 3], [[[2], 3], -1]], "MEDIUM", ["dynamic-programming"]],
  ["House Robber", "rob", ["nums"], [[[[1, 2, 3, 1]], 4], [[[2, 7, 9, 3, 1]], 12]], "MEDIUM", ["dynamic-programming"]],
  ["Number of Islands", "numIslands", ["grid"], [[[[["1", "1", "0"], ["0", "1", "0"], ["1", "0", "1"]]], 3]], "MEDIUM", ["graph", "dfs"]],
  ["Merge Intervals", "merge", ["intervals"], [[[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]]], "MEDIUM", ["array", "sorting"]],
  ["Kth Largest Element", "findKthLargest", ["nums", "k"], [[[[3, 2, 1, 5, 6, 4], 2], 5], [[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4]], "MEDIUM", ["heap", "sorting"]],
  ["Word Break", "wordBreak", ["s", "wordDict"], [[["leetcode", ["leet", "code"]], true], [["catsandog", ["cats", "dog", "sand", "and", "cat"]], false]], "MEDIUM", ["dynamic-programming", "trie"]],
  ["Course Schedule", "canFinish", ["numCourses", "prerequisites"], [[[2, [[1, 0]]], true], [[2, [[1, 0], [0, 1]]], false]], "MEDIUM", ["graph", "topological-sort"]],
  ["LRU Cache Operations", "runLRU", ["capacity", "operations"], [[[2, [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2]]], [null, null, 1, null, -1]]], "HARD", ["design", "hash-table"]],
  ["Trapping Rain Water", "trap", ["height"], [[[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], 6], [[[4, 2, 0, 3, 2, 5]], 9]], "HARD", ["array", "two-pointers"]],
  ["Median of Two Sorted Arrays", "findMedianSortedArrays", ["nums1", "nums2"], [[[[1, 3], [2]], 2], [[[1, 2], [3, 4]], 2.5]], "HARD", ["array", "binary-search"]],
  ["Minimum Window Substring", "minWindow", ["s", "t"], [[["ADOBECODEBANC", "ABC"], "BANC"], [["a", "aa"], ""]], "HARD", ["hash-table", "sliding-window"]],
  ["Serialize Tree Levels", "levelOrderValues", ["values"], [[[[3, 9, 20, null, null, 15, 7]], [[3], [9, 20], [15, 7]]]], "MEDIUM", ["tree", "bfs"]],
  ["Edit Distance", "minDistance", ["word1", "word2"], [[["horse", "ros"], 3], [["intention", "execution"], 5]], "HARD", ["dynamic-programming"]],
  ["Subarray Sum Equals K", "subarraySum", ["nums", "k"], [[[[1, 1, 1], 2], 2], [[[1, 2, 3], 3], 2]], "MEDIUM", ["array", "prefix-sum"]],
];

const discussionTitles = [
  "Why does my two pointer solution fail on edge cases?",
  "Sharing a clean dynamic programming explanation",
  "Can this be solved without extra memory?",
  "Runtime difference between map and object in JavaScript",
  "Looking for feedback on my recursive approach",
  "Test cases that helped me understand the problem",
  "How to spot the greedy invariant here",
  "Common mistakes when reading the constraints",
];

const commentBodies = [
  "This helped me find the missing empty input case.",
  "The key is to compare the invariant before writing code.",
  "I got accepted after switching from nested loops to a map.",
  "There is a shorter version, but this one is easier to debug.",
  "The explanation around the boundary condition is useful.",
  "Try printing the intermediate state for the second sample.",
  "This fails when the input has duplicated values.",
  "I think the complexity is O(n log n) because of the sort.",
];

const toCode = (value) => JSON.stringify(value);

const languages = ["javascript", "typescript", "python", "java", "c", "cpp", "go"];

const makeDeclaration = ({ fnName, params }, language) => {
  if (language === "python") {
    return `def ${fnName}(${params.join(", ")}):\n    # Write your solution here.\n    pass`;
  }
  if (language === "java") {
    return `class Solution {\n    public static Object ${fnName}(${params.map((param) => `Object ${param}`).join(", ")}) {\n        // Write your solution here.\n        return null;\n    }\n}`;
  }
  if (language === "cpp") {
    return `auto ${fnName}(${params.map((param) => `auto ${param}`).join(", ")}) {\n  // Write your solution here.\n}`;
  }
  if (language === "c") {
    return `void* ${fnName}(${params.map((param) => `void* ${param}`).join(", ")}) {\n  /* Write your solution here. */\n  return 0;\n}`;
  }
  if (language === "go") {
    return `func ${fnName}(${params.map((param) => `${param} any`).join(", ")}) any {\n\t// Write your solution here.\n\treturn nil\n}`;
  }
  if (language === "typescript") {
    return `function ${fnName}(${params.map((param) => `${param}: any`).join(", ")}): any {\n  // Write your solution here.\n}`;
  }
  return `function ${fnName}(${params.join(", ")}) {\n  // Write your solution here.\n}`;
};

const normalizeForCompare = (value) => {
  if (!Array.isArray(value)) return value;
  if (!Array.isArray(value[0])) return value;
  return value.map((group) => Array.isArray(group) ? [...group].sort() : group).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
};

const makeJavaScriptTemplate = ({ fnName, tests }) => {
  const normalizedTests = tests.map(([args, expected]) => ({
    args,
    expected,
    unorderedGroups: Array.isArray(expected) && Array.isArray(expected[0]),
  }));

  return `const assert = require("assert");

// USER CODE HERE
// END USER CODE

const tests = ${toCode(normalizedTests)};

function normalize(value, unorderedGroups) {
  if (!unorderedGroups || !Array.isArray(value)) return value;
  return value
    .map((group) => Array.isArray(group) ? [...group].sort() : group)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

for (const test of tests) {
  const actual = ${fnName}(...test.args);
  assert.deepStrictEqual(
    normalize(actual, test.unorderedGroups),
    normalize(test.expected, test.unorderedGroups)
  );
}

console.log("Accepted");
`;
};

const makeTypeScriptTemplate = ({ fnName, tests }) => {
  const normalizedTests = tests.map(([args, expected]) => ({
    args,
    expected,
    unorderedGroups: Array.isArray(expected) && Array.isArray(expected[0]),
  }));

  return `import assert from "assert";

// USER CODE HERE
// END USER CODE

const tests: Array<{ args: any[]; expected: any; unorderedGroups: boolean }> = ${toCode(normalizedTests)};

function normalize(value: any, unorderedGroups: boolean): any {
  if (!unorderedGroups || !Array.isArray(value)) return value;
  return value
    .map((group) => Array.isArray(group) ? [...group].sort() : group)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

for (const test of tests) {
  const actual = ${fnName}(...test.args);
  assert.deepStrictEqual(
    normalize(actual, test.unorderedGroups),
    normalize(test.expected, test.unorderedGroups)
  );
}

console.log("Accepted");
`;
};

const makePythonTemplate = ({ fnName, tests }) => {
  const normalizedTests = tests.map(([args, expected]) => ({
    args,
    expected,
    unorderedGroups: Array.isArray(expected) && Array.isArray(expected[0]),
  }));

  return `# USER CODE HERE
# END USER CODE

tests = ${JSON.stringify(normalizedTests, null, 2)
    .replace(/\btrue\b/g, "True")
    .replace(/\bfalse\b/g, "False")
    .replace(/\bnull\b/g, "None")}

def normalize(value, unordered_groups):
    if not unordered_groups or not isinstance(value, list):
        return value
    return sorted([sorted(group) if isinstance(group, list) else group for group in value], key=lambda item: str(item))

for test in tests:
    actual = ${fnName}(*test["args"])
    assert normalize(actual, test["unorderedGroups"]) == normalize(test["expected"], test["unorderedGroups"])

print("Accepted")
`;
};

const makeStarterTemplate = (problem, language) => {
  const { fnName } = problem;
  if (language === "java") {
    return `// USER CODE HERE
// END USER CODE

public class Main {
    public static void main(String[] args) {
        // Local seed starter for ${fnName}. Add language-specific tests before enabling Java judging.
        System.out.println("Template loaded");
    }
}
`;
  }
  if (language === "cpp") {
    return `#include <bits/stdc++.h>
using namespace std;

// USER CODE HERE
// END USER CODE

int main() {
  // Local seed starter for ${fnName}. Add language-specific tests before enabling C++ judging.
  cout << "Template loaded" << endl;
  return 0;
}
`;
  }
  if (language === "c") {
    return `#include <stdio.h>

// USER CODE HERE
// END USER CODE

int main(void) {
  /* Local seed starter for ${fnName}. Add language-specific tests before enabling C judging. */
  puts("Template loaded");
  return 0;
}
`;
  }
  if (language === "go") {
    return `package main

import "fmt"

// USER CODE HERE
// END USER CODE

func main() {
\t// Local seed starter for ${fnName}. Add language-specific tests before enabling Go judging.
\tfmt.Println("Template loaded")
}
`;
  }
  return makeJavaScriptTemplate(problem);
};

const makeTemplate = (problem, language) => {
  if (language === "javascript") return makeJavaScriptTemplate(problem);
  if (language === "typescript") return makeTypeScriptTemplate(problem);
  if (language === "python") return makePythonTemplate(problem);
  return makeStarterTemplate(problem, language);
};

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

async function putObject(key, body) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
}

function makeProblem(spec) {
  const [title, fnName, params, tests, difficulty, tags] = spec;
  const first = tests[0];
  return {
    title,
    fnName,
    params,
    tests,
    difficulty,
    tags,
    description: {
      text: `Implement ${fnName}(${params.join(", ")}) and return the expected result. Your submitted function is inserted into a JavaScript judge harness with hidden-style assertions.`,
      examples: [
        {
          input: params.map((param, index) => `${param} = ${toCode(first[0][index])}`).join(", "),
          output: toCode(first[1]),
          explanation: "Return the value that satisfies the examples and constraints.",
        },
      ],
      constraints: [
        "Inputs are valid JavaScript values matching the function signature.",
        "Return the answer instead of printing it.",
        "Aim for the standard LeetCode-style complexity for this topic.",
      ],
      extra: "Seeded for local development. Template language: javascript.",
    },
    supports: languages,
  };
}

async function main() {
  await mongoose.connect(mongoUri, { dbName });
  await ensureBucket();

  await Promise.all([
    Auth.deleteMany({}),
    User.deleteMany({}),
    Problem.deleteMany({}),
    Discussion.deleteMany({}),
    Comment.deleteMany({}),
    Submission.deleteMany({}),
    DailyProblem.deleteMany({}),
    Vote.deleteMany({}),
    Todo.deleteMany({}),
  ]);

  const password = await bcrypt.hash("password123", 10);
  const authDocs = [];
  const userDocs = [];
  for (let i = 1; i <= 100; i++) {
    const _id = new mongoose.Types.ObjectId();
    const admin = i === 1;
    authDocs.push({
      _id,
      username: admin ? "seedadmin" : `seeduser${String(i).padStart(3, "0")}`,
      email: admin ? "seedadmin@example.com" : `seeduser${String(i).padStart(3, "0")}@example.com`,
      password,
      role: admin ? "ADMIN" : "USER",
      isAuthenticated: true,
      isEmailVerified: true,
    });
    userDocs.push({
      _id,
      name: admin ? "Seed Admin" : `Seed User ${String(i).padStart(3, "0")}`,
      avatar: `https://api.dicebear.com/9.x/identicon/svg?seed=leetbase-${i}`,
    });
  }
  await Auth.insertMany(authDocs);
  await User.insertMany(userDocs);

  const problemDocs = await Problem.insertMany(problemSpecs.map((spec) => {
    const problem = makeProblem(spec);
    return {
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      tags: problem.tags,
      supports: problem.supports,
    };
  }));

  for (let i = 0; i < problemDocs.length; i++) {
    const spec = problemSpecs[i];
    const problem = makeProblem(spec);
    await Promise.all(languages.flatMap((language) => [
      putObject(`${problemDocs[i]._id}/funcs/${language}`, makeDeclaration(problem, language)),
      putObject(`${problemDocs[i]._id}/templates/${language}`, makeTemplate(problem, language)),
    ]));
  }

  const today = new Date();
  const dailyDocs = problemDocs.slice(0, 30).map((problem, index) => ({
    problem: problem._id,
    date: new Date(today.getFullYear(), today.getMonth(), index + 1),
  }));
  await DailyProblem.insertMany(dailyDocs);

  const submissionDocs = [];
  for (let i = 0; i < 180; i++) {
    const problem = pick(problemDocs);
    const user = pick(userDocs);
    const status = pick(["ACCEPTED", "ACCEPTED", "ACCEPTED", "WRONG_ANSWER", "COMPILE_ERROR"]);
    submissionDocs.push({
      user: user._id,
      problem: problem._id,
      language: "javascript",
      status,
      code: "function solution() {\n  // seeded submission sample\n}",
      error: status === "ACCEPTED" ? null : "Seeded failed run",
      runtime: int(15, 350),
      createdAt: new Date(Date.now() - int(0, 45) * 86400000),
      updatedAt: new Date(),
    });
  }
  await Submission.insertMany(submissionDocs);

  const discussionDocs = [];
  for (let i = 0; i < 80; i++) {
    const problem = pick(problemDocs);
    const solution = random() > 0.55 ? { problem: problem._id, language: "javascript" } : undefined;
    discussionDocs.push({
      title: `${pick(discussionTitles)} #${i + 1}`,
      content: `Discussion seeded for ${problem.title}. It includes realistic forum text for pagination, population, voting, and solution filtering.`,
      author: pick(userDocs)._id,
      tags: [...new Set([pick(problem.tags), pick(["help", "solution", "javascript", "complexity", "edge-case"])])],
      solution,
      isClosed: random() > 0.9,
      upvotes: int(0, 80),
      downvotes: int(0, 8),
      comments: [],
      createdAt: new Date(Date.now() - int(0, 60) * 86400000),
      updatedAt: new Date(),
    });
  }
  const discussions = await Discussion.insertMany(discussionDocs);

  const topLevelComments = [];
  for (const discussion of discussions) {
    const count = int(2, 5);
    for (let i = 0; i < count; i++) {
      topLevelComments.push({
        content: pick(commentBodies),
        author: pick(userDocs)._id,
        replies: [],
        upvotes: int(0, 25),
        downvotes: int(0, 3),
        discussionId: discussion._id,
        createdAt: new Date(Date.now() - int(0, 60) * 86400000),
        updatedAt: new Date(),
      });
    }
  }

  const insertedTopLevel = await Comment.insertMany(topLevelComments.map(({ discussionId, ...doc }) => doc));
  const commentsByDiscussion = new Map();
  insertedTopLevel.forEach((comment, index) => {
    const discussionId = topLevelComments[index].discussionId.toString();
    const list = commentsByDiscussion.get(discussionId) || [];
    list.push(comment._id);
    commentsByDiscussion.set(discussionId, list);
  });

  const replyDocs = [];
  for (const comment of insertedTopLevel) {
    if (random() > 0.55) {
      replyDocs.push({
        content: pick(commentBodies),
        author: pick(userDocs)._id,
        replies: [],
        upvotes: int(0, 10),
        downvotes: int(0, 2),
        parentId: comment._id,
        createdAt: new Date(Date.now() - int(0, 40) * 86400000),
        updatedAt: new Date(),
      });
    }
  }
  const insertedReplies = await Comment.insertMany(replyDocs.map(({ parentId, ...doc }) => doc));

  await Promise.all([
    ...discussions.map((discussion) => Discussion.updateOne(
      { _id: discussion._id },
      { $set: { comments: commentsByDiscussion.get(discussion._id.toString()) || [] } }
    )),
    ...insertedReplies.map((reply, index) => Comment.updateOne(
      { _id: replyDocs[index].parentId },
      { $push: { replies: reply._id } }
    )),
  ]);

  const todoDocs = [];
  for (const user of userDocs.slice(0, 40)) {
    for (let i = 0; i < 3; i++) {
      todoDocs.push({ user: user._id, problem: pick(problemDocs)._id });
    }
  }
  await Todo.insertMany(todoDocs);

  console.log(`Seed complete: ${userDocs.length} users, ${problemDocs.length} problems, ${discussions.length} discussions, ${insertedTopLevel.length + insertedReplies.length} comments.`);
  console.log("Admin login: seedadmin@example.com / password123");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
