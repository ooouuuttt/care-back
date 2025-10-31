import jwt from 'jsonwebtoken'

//admin authentication middleware
const authAdmin = async (req, res, next) => {
    try {
      const { atoken } = req.headers;
  
      if (!atoken) {
        return res.json({ success: false, message: 'Not Authorized, Login Again' });
      }
  
      // Verify the token and decode the payload
      const token_decode = jwt.verify(atoken, 'murtaza'); // Ensure secret matches the one used in login
  
      // Check if the decoded email matches the admin's email
      if (token_decode.email !== 'admin@careconnect.com') {
        return res.json({ success: false, message: 'Not Authorized, Login Again' });
      }
  
      next(); // If the token is valid and the email matches, proceed to the next middleware
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: error.message });
    }
  };
  

export default authAdmin