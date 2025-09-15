import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();


const generateAccessTokenAndRefreshToken= async(userID)=>
{
   try {
        const user= await User.findById(userID);
   
        const accessToken = user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()
       
         user.refreshToken = refreshToken
         await user.save({validateBeforeSave: true})
         return {accessToken,refreshToken}

   } catch (error) {
      throw new ApiError(500,"something went wrong in generating access and refrsh token")
   }
}


const registerUser = asyncHandler
(
    async(req,res) => 
    {
      
         const {email,password,phone,address,name} = req.body;
         
         if (!email || !password || !phone  || !name) 
            {
            throw new ApiError(409, "One or more required fields are empty");
            }
         
         const existedUser = await User.findOne({email});

         if(existedUser)
         {
            throw new ApiError(409,"Username or Email already exist")
         }

         const user =await User.create
         (
            {
                email,
                password,
                phone,
                address,
                name
            }
         )

         const createdUser =await User.findById(user._id).select("-password -refreshToken");

         if(!createdUser)
         {
            throw  new ApiError(500,"someting went wrong");
         }

        return res.status(201).json
        (
            new ApiResponse(200,createdUser,"user registered succesfully")
        )

        
    }
)
const authRedirect = asyncHandler
( 
   async (req,res) =>
   {
      

     const  userId=req.user._id;
      
      const user = await User.findOne({ _id: userId });
   
      if(!user)
      {
         throw new ApiError(404,"user does not exist")
      }
      
      return res
      .status(200)
      .json(
         new ApiResponse(200,"user exist",{userId})
      )
   }

)

// const PDF = asyncHandler(async (req, res) => {
//    const _id = "66294b1f0ca43b9e5524eb7a";

   
       
//        const pdfPath = await pdf(_id);

      
//        const coverImage = await uploadOnCloudinary(pdfPath);

       
       
      

       
//        return res.status(200).json(new ApiResponse(200, null, "PDF generated and uploaded successfully"));
  
// });



const loginUser = asyncHandler
( 
   async (req,res) =>
   {
      //check email or username exist
      //check password
      //genrate token and make them login
      
      const { email , password } = req.body;
      


      

      if(!email)
      {
         throw new ApiError(400,"email required")
      }

      const user =await User.findOne({email})
      if(!user)
      {
         throw new ApiError(404,"user does not exist")
      }
      const isPasswordValid = await user.isPasswordCorrect(password);

      if(!isPasswordValid )
      {
         throw new ApiError(401,"Password invalid")
      }
      const {accessToken,refreshToken} =await generateAccessTokenAndRefreshToken(user._id);
      
      const loggedIn = await User.findById(user._id).select("-password -refreshToken");

      const options=
      {
         httpOnly:true,
         secure: true
      }

      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
         new ApiResponse(200,
         {
            user: loggedIn,accessToken,refreshToken
         },
         "user logged in successfully"
      )
      )
   }

)

const logoutUser = asyncHandler
(
   async(req,res) =>
   {
     
         const user =await User.findByIdAndUpdate
         (req.user._id,
            {
               $set:{refreshToken:undefined}
            },
            {
               new: true
            }

         )
         
         const options=
         {
            httpOnly:true,
            secure: true
         }

         return res
         .status(200)
         .clearCookie("accessToken",options)
         .clearCookie("refreshToken",options)
         .json(new ApiResponse(200,{},"user logged out"))
         
   }

)

const refreshAccessToken = asyncHandler
(
   async(req,res) =>
   {
     const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken;

     if(!incomingRefreshToken)
     {
       throw new ApiError(401,"Unauthorized request")
     }
     try {
      const docodedToken =jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
 
      const user = await User.findById(docodedToken?._id);
 
      if(!user)
      {
        throw new ApiError(401,"Invaild refreshToken")
      }
 
      if(incomingRefreshToken !== user?.refreshToken)
      {
       throw new ApiError(401,"refresh toke n is expired or used")
      }
 
     const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user?._id);
 
      const options =
      {
          httpOnly: true,
          secure: true
      }
      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
         new ApiResponse(200,
         {
          accessToken,refreshToken:newRefreshToken
         },
         "Access token refreshed"
      )
      )
     } catch (error) {
       throw new ApiError(401,error?.message||"invalid refresh token")
     }

   }
)
//Admin
const updateUserDetails = asyncHandler(async (req, res) => {
    const { userId, name, email, phone } = req.body;

    // Validate required fields
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Update only provided fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    // Save updated user
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, user, "User details updated successfully")
    );
});

const getAllUsers = asyncHandler(
    async (req, res) => {
        // Fetch all users from the database
        const users = await User.find().select("-password -refreshToken");

        if (!users || users.length === 0) {
            throw new ApiError(404, "No users found");
        }

        return res.status(200).json(
            new ApiResponse(200, { users }, "Users retrieved successfully")
        );
    }
);

const deleteUserById = asyncHandler(
    async (req, res) => {
        const { id } = req.body;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        return res.status(200).json(
            new ApiResponse(200, null, "User deleted successfully")
        );
    }
);

export 
{
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   authRedirect,
   updateUserDetails,
   getAllUsers,
   deleteUserById
   
 
}