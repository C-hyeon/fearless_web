import { motion } from "framer-motion";
import "../styles/Modal.scss";

const Modal = ({isOpen, onClose, children}) => {
    if(!isOpen) return null;

    return (
        <div className="overlay" onClick={onClose}>
            <motion.div 
                className="modal" 
                onClick={(e)=>e.stopPropagation()}
                initial={{opacity: 0, y: -50}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: 50}}
                transition={{duration: 0.3}}
            >
                <button className="closeButton" onClick={onClose}>
                    &times;
                </button>
                {children}
            </motion.div>
        </div>
    );
};

export default Modal;