import "../styles/Main.scss";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Main = () => {
    return (
        <div className="main-container">
            <Header />
            <div className="main-content">
                <div className="image-box">
                    <h1>Fearless_image</h1>
                </div>
                <aside className="side-title">Fear Less</aside>
            </div>
            <Footer />
        </div>
    );
};

export default Main;