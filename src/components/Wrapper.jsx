import { motion } from "framer-motion";

const Wrapper = ({children}) => {
    return (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 1.0, ease: "easeInOut"}}
        >
            {children}
        </motion.div>
    );
};

export default Wrapper;