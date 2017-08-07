import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { bindActionCreators } from 'redux';
import getListingsAction from '../actions/getListingsAction.js';

class Listings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            listingsHeading: 'All listings'
        }
    }

    componentDidMount() {
        if (this.props.cat === "my-listings") {
            // Get the user's listings
            this.props.getListingsData("my-listings", this.props.auth.token);
        } else if (this.props.cat) {
            // Get the listings that match the category supplied by the router
            this.props.getListingsData(this.props.cat);
        } else {
            // Get all listings
            this.props.getListingsData("Home");
        }
    }

    componentWillReceiveProps(nextProps){
        if (this.props.cat !== nextProps.cat) {
            if (nextProps.cat === "my-listings") {
                // Get the user's listings
                this.props.getListingsData("my-listings", this.props.auth.token);
            } else if(nextProps.cat) {
                // Get the listings that match the category supplied by the router
                this.props.getListingsData(nextProps.cat);
            } else {
                // Get all listings
                this.props.getListingsData("Home");
            }
        }
    }

    render() {
        var category = this.props.cat;
        var heading = 'all listings';
        if (category !== undefined) {
            heading = category;
        }
        var listings = [];
        this.props.listingsData.map((listing, index) => {
            var link = '/listing/' + listing.id;
            var src = `http://localhost:3001/images/${listing.url}`;
            return listings.push(
                <div key={index} className='listing-item'>
                    <div className='listing-img'>
                        <Link to={link}>
                            <img src={src} role='presentation'></img>
                        </Link>
                        <div className='current-bid'>
                            ${listing.current_bid}
                        </div>
                    </div>

                    <div className='listing-content'>
                        <div className='title'>{listing.title}</div>
                        <div className='description'>
                            {listing.description}
                        </div>

                        <div className='end-date'>
                            <div className='bid-btn'>
                                <Button bsStyle="success" bsSize="xsmall">
                                    Bid
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        });
        return(
            <div className='listings-wrapper'>
                <h3>{heading}</h3>
                <div className='listings'>
                    {listings}
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    return {
        listingsData: state.listings,
        auth: state.auth
    }
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({
        getListingsData: getListingsAction
    }, dispatch)
}

export default connect(mapStateToProps, mapDispatchToProps)(Listings);
