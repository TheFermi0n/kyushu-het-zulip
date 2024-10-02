let subjectGroups = {}; // Global object to store messages grouped by subject
let userProfiles = {}; // Global variable to store user profile information
let allMessages = []; // Global variable to store all messages
let channelGroups = {}; // Global variable to store channels grouped by their recipient id
let currentChannelId = null;
let currentSubjectMessages = null;
let currentSubjectName = null; // Store the selected subject name

let currentPage = 1;
const pageSize = 10; // Messages per page

// Function to load data from all the JSON files
function loadJSON() {
  const messageFiles = [
    "../_resources/messages-000001.json",
    "../_resources/messages-000002.json",
    "../_resources/messages-000003.json",
  ]; // List of message JSON files to read
  const realmFile = "../_resources/realm.json"; // The realm (channel) file to read

  // Load messages and realm in parallel
  let messagePromises = messageFiles.map((file) =>
    fetch(file).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    }),
  );

  let realmPromise = fetch(realmFile).then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  });

  // Load all JSON files (messages + realm)
  Promise.all([...messagePromises, realmPromise])
    .then((jsonDataArray) => {
      const realmData = jsonDataArray.pop(); // Last one is realm.json data

      // Store user profiles for quick lookup
      realmData.zerver_userprofile.forEach((profile) => {
        userProfiles[profile.id] = {
          email: profile.email,
          full_name: profile.full_name,
        };
      });

      // Merge messages from all message JSON files
      jsonDataArray.forEach((data) => {
        allMessages = allMessages.concat(data.zerver_message);
      });

      // Group subjects by channel (recipient id) and by subject
      groupChannelsByRecipient(realmData.zerver_stream); // Group channels from realm.json
      groupBySubject(); // Group subjects under the respective channels

      console.log("All messages and realms loaded.");

      displayChannelsAndSubjects(); // Display the channels and subjects in the sidebar
    })
    .catch((error) => {
      console.error("Error loading JSON:", error);
      document.getElementById("content").innerHTML =
        "<p>Error loading data. Please try again.</p>";
    });
}

// Function to group channels by recipient id
function groupChannelsByRecipient(channels) {
  channels.forEach((channel) => {
    channelGroups[channel.recipient] = {
      name: channel.name,
      description: channel.rendered_description,
      subjects: {}, // Placeholder for subjects within this channel
    };
  });
}

// Function to group messages by subject under their respective channels
function groupBySubject() {
  subjectGroups = {}; // Reset subject groups
  allMessages.forEach((message) => {
    const recipientId = message.recipient; // Channel under which the message belongs
    const subject = message.subject;

    if (!channelGroups[recipientId]) {
      // If the channel (recipient) is not found, skip the message
      return;
    }

    if (!channelGroups[recipientId].subjects[subject]) {
      channelGroups[recipientId].subjects[subject] = [];
    }
    channelGroups[recipientId].subjects[subject].push(message);
  });
}

function displayChannelsAndSubjects() {
  const subjectList = document.getElementById("subjectList");
  subjectList.innerHTML = ""; // Clear the list

  const channels = Object.keys(channelGroups);

  if (channels.length === 0) {
    document.getElementById("content").innerHTML = "<p>No messages found.</p>";
    return;
  }

  channels.forEach((channelId) => {
    const channel = channelGroups[channelId];

    // Create a list item for each channel
    const channelLi = document.createElement("div");

    const channelTitle = document.createElement("h4");
    channelTitle.innerHTML = `<i class="fa-solid fa-hashtag"></i> &nbsp; ${channel.name}`;
    channelTitle.className = "channel-title"; // Style for channel title
    channelLi.appendChild(channelTitle);

    // Create a sub-list for subjects under this channel
    const subjectUl = document.createElement("ul");
    subjectUl.className = "subject-list"; // Class for styling subjects
    subjectUl.style.display = "none"; // Initially collapse the subject list

    Object.keys(channel.subjects).forEach((subject) => {
      const subjectLi = document.createElement("li");
      subjectLi.textContent = subject;
      subjectLi.className = "subject-item"; // Class for subject items
      subjectLi.addEventListener("click", () => {
        currentPage = 1; // Reset pagination

        // Set current channel and subject variables
        currentChannelId = channelId;
        currentSubjectName = subject;
        currentSubjectMessages = channel.subjects[subject];

        displayMessages(currentSubjectMessages); // Display the messages for this subject

        const subDetailDiv = document.getElementById("subjectName");
        subDetailDiv.innerHTML = `${channel.name}`;
        const subDesc = document.getElementById("subjectDescription");
        subDesc.innerHTML = `${channel.description}`; // Show description here

        const messageSubHeader = document.getElementById("message-sub-head");
        messageSubHeader.innerHTML = `<i class="fa-solid fa-hashtag"></i> ${channel.name} > ${subject}`;

        // Remove active class from all subject list items
        const allSubjects = document.querySelectorAll("#subjectList li");
        allSubjects.forEach((item) => item.classList.remove("active"));

        // Add active class to the clicked subject
        subjectLi.classList.add("active");
      });
      subjectUl.appendChild(subjectLi);
    });

    // Append subjects under the channel (initially hidden)
    channelLi.appendChild(subjectUl);
    subjectList.appendChild(channelLi);

    // Add toggle functionality to collapse/expand subjects on click
    channelTitle.addEventListener("click", () => {
      channelLi.classList.toggle("collapsible");
      subjectUl.style.display =
        subjectUl.style.display === "none" ? "block" : "none";
      channelTitle.classList.toggle("active"); // Toggle active class for styling
    });
  });

  // Automatically display the first channel's first subject's messages by default
  const firstChannel = channelGroups[channels[0]];
  const firstSubject = Object.keys(firstChannel.subjects)[0];
  if (firstChannel && firstSubject) {
    currentChannelId = channels[0];
    currentSubjectMessages = firstChannel.subjects[firstSubject];
    displayMessages(currentSubjectMessages);
  }
}

// Function to display messages with user profiles matched and add pagination
function displayMessages(messages, page = 1) {
  const contentDiv = document.getElementById("content");
  contentDiv.innerHTML = ""; 

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMessages = messages.slice(startIndex, endIndex);

  // Check if there are messages to display
  if (paginatedMessages.length === 0) {
    contentDiv.innerHTML = "<p>No messages found.</p>";
    return;
  }

  // Loop through each message and create HTML for it
  paginatedMessages.forEach((message) => {
    const messageDiv = document.createElement("div");

    // Match sender with user profile using user_profile_id
    const senderProfile = userProfiles[message.sender];
    const senderName = senderProfile
      ? senderProfile.full_name
      : "Unknown Sender";

    // Fixing the links to attached files
    let fixedRenderedContent = message.rendered_content
      .replace(/href="\/user_uploads\//g, 'href="/_resources/uploads/')
      .replace(/src="\/user_uploads\//g, 'src="/_resources/uploads/');

    // Create a temporary container for DOM manipulation, only for message.rendered_content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = fixedRenderedContent;

    const anchorTags = tempDiv.querySelectorAll("a");
    anchorTags.forEach((anchor) => {
      if (anchor.querySelector("img")) {
        anchor.setAttribute("data-lightbox", `${message.id}`);
      }
    });

    // Convert the modified HTML back to a string
    fixedRenderedContent = tempDiv.innerHTML;

    // Render the message details with the sender's email and fixed links
    messageDiv.innerHTML = `
            <div class="message-block">
            <p class="date badge badge-pill badge-light">${new Date(
              message.date_sent * 1000,
            ).toLocaleString()}</p>
              <p class="message-sender">${senderName}</p>
              <p class="message">${fixedRenderedContent}</p>
            </div>
        `;
    contentDiv.appendChild(messageDiv);
  });

  // Display pagination controls
  displayPaginationControls(messages, page);
}

// Function to display pagination controls with numbered buttons
function displayPaginationControls(messages, page) {
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = "";

  const totalPages = Math.ceil(messages.length / pageSize);

  // Previous page button
  if (page > 1) {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.addEventListener("click", () =>
      displayMessages(messages, page - 1),
    );
    paginationDiv.appendChild(prevButton);
  }

  // Numbered page buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    if (i === page) {
      pageButton.classList.add("active"); // Highlight the current page
    }
    pageButton.addEventListener("click", () => displayMessages(messages, i));
    paginationDiv.appendChild(pageButton);
  }

  // Next page button
  if (page < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.addEventListener("click", () =>
      displayMessages(messages, page + 1),
    );
    paginationDiv.appendChild(nextButton);
  }
}

// Debounce function to prevent immediate search filtering on every keystroke
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Function to filter messages based on search input and selected scope
function filterMessages() {
  const searchInput = document.getElementById("search").value.toLowerCase();
  const searchScope = document.getElementById("search-scope").value;
  let filteredMessages = [];

  const messageSubHeader = document.getElementById("message-sub-head");

  if (searchScope === "all") {
    // Search across all messages
    filteredMessages = allMessages.filter((message) => {
      const senderProfile = userProfiles[message.sender];
      const senderName = senderProfile
        ? senderProfile.full_name.toLowerCase()
        : "";

      return (
        message.subject.toLowerCase().includes(searchInput) ||
        message.content.toLowerCase().includes(searchInput) ||
        senderName.includes(searchInput)
      );
    });
    messageSubHeader.innerHTML = `Showing search result for All Messages`;
  } else if (searchScope === "channel") {
    // Search only in the current channel
    const currentChannel = channelGroups[currentChannelId]; // Get messages from current channel
    const channelMessages = Object.values(currentChannel.subjects).flat(); // Flatten all messages for the channel

    filteredMessages = channelMessages.filter((message) => {
      const senderProfile = userProfiles[message.sender];
      const senderName = senderProfile
        ? senderProfile.full_name.toLowerCase()
        : "";

      return (
        message.subject.toLowerCase().includes(searchInput) ||
        message.content.toLowerCase().includes(searchInput) ||
        senderName.includes(searchInput)
      );
    });
    messageSubHeader.innerHTML = `Showing search result for <i class="fa-solid fa-hashtag"></i> ${currentChannel.name}`;
  } else if (searchScope === "subject") {
    // Search only in the current subject
    const currentChannel = channelGroups[currentChannelId]; // Get messages from current channel
    filteredMessages = currentSubjectMessages.filter((message) => {
      const senderProfile = userProfiles[message.sender];
      const senderName = senderProfile
        ? senderProfile.full_name.toLowerCase()
        : "";

      return (
        message.subject.toLowerCase().includes(searchInput) ||
        message.content.toLowerCase().includes(searchInput) ||
        senderName.includes(searchInput)
      );
    });
    messageSubHeader.innerHTML = `Showing search result for <i class="fa-solid fa-hashtag"></i> ${currentChannel.name} > ${currentSubjectName}`;
  }

  displayMessages(filteredMessages);
}

// Add debounce to the search input
document
  .getElementById("search")
  .addEventListener("input", debounce(filterMessages, 300));

// Load the messages when the page loads
window.onload = loadJSON;
