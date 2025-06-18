import { AnimatePresence, motion } from "framer-motion";
import "../styles/Modal.scss";

const Modal = ({isOpen, onClose, children}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="overlay" onClick={onClose}>
                    <motion.div 
                        className="modal" 
                        onClick={(e)=>e.stopPropagation()}
                        initial={{opacity: 0, y: -50}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: 50}}
                        transition={{duration: 0.4}}
                    >
                        <button className="closeButton" onClick={onClose}>
                            &times;
                        </button>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;