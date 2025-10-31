import jwt from 'jsonwebtoken'

//USER authentication middleware
const authUser = async (req, res, next) => {
    try {
      const { token } = req.headers;
  
      if (!token) {
        return res.json({ success: false, message: 'Not Authorized, Login Again' });
      }
  
      // Verify the token and decode the payload
      const token_decode = jwt.verify(token, 'Murtaza'); // Ensure secret matches the one used in login
  
      req.body.userId = token_decode.id
  
      next(); // If the token is valid and the email matches, proceed to the next middleware
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: error.message });
    }
  };
  

export default authUser