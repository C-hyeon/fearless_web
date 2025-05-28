import "../styles/Main.scss";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Main = () => {
    return (
        <div className="main-container">
            <Header />
            <div className="main-content">
                <div className="image-box">
                    <div className="left-panel">
                        <h1>Fear Less</h1>
                    </div>
                    <div className="right-panel" />
                    <svg className="diagonal-line" viewBox="0 0 100 100" preserveAspectRatio="none" />
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Main;