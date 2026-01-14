import { Icon } from "@iconify/react";
import GitHubIcon from "/src/assets/github-mark.svg";

function Footer() {
  return (
    <footer className="hero-footer">
      <div className="footer-links">
        <a
          href="https://github.com/GoSkyH1gh/aspexis"
          target="_blank"
          className="social-link"
        >
          <img src={GitHubIcon} alt="GitHub Logo" />
          GitHub
        </a>
        <a href="https://stats.uptimerobot.com/4SlpKHo4uS" target="_blank" className="social-link">
          <Icon icon={"material-symbols:browse-activity-outline-rounded"} color="#FFF"/>
          Status
        </a>
      </div>
      <br />
      Not associated with Mojang, Hypixel, Wynncraft, Donut SMP, nor MCC Island.
    </footer>
  );
}
export default Footer;
