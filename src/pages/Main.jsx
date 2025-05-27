import "../styles/Main.scss";
import Header from "../components/Header";

const Main = () => {
    return (
        <div className="main-container">
            <Header />
            <div className="main-content">
                <aside className="side-title">Fear<br/>Less</aside>
                <div className="image-box">
                    <h1>Fearless_image</h1>
                </div>
            </div>
        </div>
    );
};

export default Main;