'use server';

import { revalidatePath } from 'next/cache';
import User from '../models/user.model';
import { connectToDatabase } from '../mongoose';
import Thread from '../models/thread.model';
import { FilterQuery, SortOrder } from 'mongoose';

type UpdateUserPayload = {
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
};
export async function updateUser(
  userId: string,
  payload: UpdateUserPayload
): Promise<void> {
  const { username, name, bio, image, path } = payload;
  connectToDatabase();

  try {
    await User.findOneAndUpdate(
      {
        id: userId,
      },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },
      { upsert: true }
    );

    if (path === '/profile/edit') {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}
export async function fetchUser(userId: string) {
  try {
    connectToDatabase();
    const user = await User.findOne({ id: userId });
    // .populate({
    //   path: 'communities',
    //   model: 'Community',
    // });
    return user;
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}
type FetchUserPayload = {
  userId: string;
  searchString?: string;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: SortOrder;
};
export async function fetchUsers({
  userId,
  searchString = '',
  pageNumber = 1,
  pageSize = 20,
  sortBy = 'desc',
}: FetchUserPayload) {
  try {
    connectToDatabase();
    const skipAmount = (pageNumber - 1) * pageSize;

    const regex = new RegExp(searchString, 'i');
    const query: FilterQuery<typeof User> = {
      id: { $ne: userId },
    };
    if (searchString.trim() !== '') {
      query.$or = [
        { username: { $regex: regex } },
        { name: { $regex: regex } },
      ];
    }

    const sortOptions = {
      createdAt: sortBy,
    };
    const usersQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    const totalUsersCount = await User.countDocuments(query);
    const users = await usersQuery.exec();
    const isNext = totalUsersCount > skipAmount + users.length;
    return {
      users,
      isNext,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    connectToDatabase();
    // Find all threads authored by user with the given userid
    // TODO: Populate community
    const threads = await User.findOne({ id: userId }).populate({
      path: 'threads',
      model: Thread,
      populate: [
        // {
        //   path: "community",
        //   model: Community,
        //   select: "name id image _id", // Select the "name" and "_id" fields from the "Community" model
        // },
        {
          path: 'children',
          model: Thread,
          populate: {
            path: 'author',
            model: User,
            select: 'name image id', // Select the "name" and "_id" fields from the "User" model
          },
        },
      ],
    });
    return threads;
  } catch (error: any) {
    throw new Error(`Failed to fetch user posts: ${error.message}`);
  }
}

export async function getActivities(userId: string) {
  try {
    connectToDatabase();

    // Find all therads authored by user with the given userid
    const userThreads = await Thread.find({ author: userId });

    // Collect all the child thread Ids (replies) from the 'children' field
    const childThreadIds = userThreads.reduce((acc, thread) => {
      return acc.concat(thread.children);
    }, []);

    const replies = await Thread.find({
      _id: { $in: childThreadIds },
      author: { $ne: userId },
    }).populate({
      path: 'author',
      model: User,
      select: 'name image _id',
    });

    return replies;
  } catch (error: any) {
    throw new Error(`Failed to fetch user acitivies: ${error.message}`);
  }
}
