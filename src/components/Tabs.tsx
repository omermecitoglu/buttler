import { faGears } from "@fortawesome/free-solid-svg-icons/faGears";
import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import Nav from "react-bootstrap/Nav";
import NavItem from "react-bootstrap/esm/NavItem";
import NavLink from "react-bootstrap/esm/NavLink";

const Tabs = () => (
  <Nav variant="tabs" defaultActiveKey="/services">
    <NavItem>
      <NavLink as={Link} href="/services">
        <FontAwesomeIcon icon={faServer} size="xl" className="fa-fw" />
      </NavLink>
    </NavItem>
    <NavItem>
      <NavLink as={Link} href="/settings">
        <FontAwesomeIcon icon={faGears} size="xl" className="fa-fw" />
      </NavLink>
    </NavItem>
  </Nav>
);

export default Tabs;
