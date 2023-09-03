'use server';
import { revalidatePath } from 'next/cache';
import Thread from '../models/thread.model';
import User from '../models/user.model';
import { connectToDatabase } from '../mongoose';

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread(params: Params) {
  const { text, author, communityId, path } = params;
  try {
    connectToDatabase();

    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });

    // Updater user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

export async function fetchThreads(pageNumber = 1, pageSize = 20) {
  try {
    connectToDatabase();

    // Calculate the number of posts to skip
    const skipAmount = pageSize * (pageNumber - 1);
    // Fetch the posts that have no parents (top-level threads)
    // Create a query to fetch the posts that have no parent (top-level threads) (a thread that is not a comment/reply).
    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({
        path: 'author',
        model: User,
      })
      // .populate({
      //   path: 'community',
      //   model: Community,
      // })
      .populate({
        path: 'children', // Populate the children field
        populate: {
          path: 'author', // Populate the author field within children
          model: User,
          select: '_id name parentId image', // Select only _id and username fields of the author
        },
      });

    // Count the total number of top-level posts (threads) i.e., threads that are not comments.
    const totalPostsCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    }); // Get the total count of posts

    const posts = await postsQuery.exec();

    const isNext = totalPostsCount > skipAmount + posts.length;

    return { posts, isNext };
  } catch (error: any) {
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }
}

export async function fetchThreadById(id: string) {
  connectToDatabase();
  try {
    const thread = await Thread.findById(id)
      .populate({
        path: 'author',
        model: User,
        select: '_id id name image',
      }) // Populate the author field with _id and username
      // .populate({
      // path: "community",
      // model: Community,
      // select: "_id id name image",
      // }) // Populate the community field with _id and name
      .populate({
        path: 'children', // Populate the children field
        populate: [
          {
            path: 'author', // Populate the author field within children
            model: User,
            select: '_id id name parentId image', // Select only _id and username fields of the author
          },
          {
            path: 'children', // Populate the children field within children
            model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
            populate: {
              path: 'author', // Populate the author field within nested children
              model: User,
              select: '_id id name parentId image', // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();
    return thread;
  } catch (error) {
    throw new Error(`Failed to fetch thread: ${error.message}`);
  }
}

type CommentPayload = {
  threadId: string;
  commentText: string;
  userId: string;
  path: string;
};
export async function addCommentToThread(payload: CommentPayload) {
  const { threadId, commentText, userId, path } = payload;
  try {
    connectToDatabase();

    const originalThread = await Thread.findById(threadId);

    if (!originalThread) {
      throw new Error('Thread not found');
    }
    // Create a new comment
    const commentThread = await Thread.create({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    // Save the new thread
    const savedCommentThread = await commentThread.save();

    // Update the original thread to include the new comment
    originalThread.children.push(savedCommentThread._id);

    // Save the updated original thread
    await originalThread.save();
    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to add comment to thread: ${error.message}`);
  }
}
